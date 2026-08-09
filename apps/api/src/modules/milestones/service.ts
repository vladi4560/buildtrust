import type { PrismaClient } from "@prisma/client";
import { ConflictError, ForbiddenError, NotFoundError } from "../../lib/app-error.js";
import { recordRelease } from "../../lib/ledger.js";
import type { PaymentPort } from "../../lib/payment-port.js";

export function createMilestonesService(prisma: PrismaClient, paymentPort: PaymentPort) {
  return {
    async submit(milestoneId: string, professionalUserId: string) {
      const milestone = await prisma.milestone.findUnique({
        where: { id: milestoneId },
        include: { contract: true },
      });
      if (!milestone) {
        throw new NotFoundError("Milestone not found");
      }
      if (milestone.contract.professionalId !== professionalUserId) {
        throw new ForbiddenError("Only the contract's professional can submit this milestone");
      }
      if (milestone.contract.status !== "ACTIVE") {
        throw new ConflictError("Contract is not active");
      }

      const result = await prisma.milestone.updateMany({
        where: { id: milestoneId, status: { in: ["PENDING", "IN_PROGRESS"] } },
        data: { status: "SUBMITTED" },
      });
      if (result.count === 0) {
        throw new ConflictError("Milestone is not awaiting submission");
      }

      return prisma.milestone.findUniqueOrThrow({ where: { id: milestoneId } });
    },

    /**
     * Approves a milestone and releases its funds. The status transition and
     * the ledger RELEASE entry happen in one transaction: an atomic
     * conditional update (status must currently be SUBMITTED) guarantees a
     * milestone can only ever be released once, even under concurrent
     * requests.
     */
    async approve(milestoneId: string, clientUserId: string) {
      const milestone = await prisma.milestone.findUnique({
        where: { id: milestoneId },
        include: { contract: true },
      });
      if (!milestone) {
        throw new NotFoundError("Milestone not found");
      }
      if (milestone.contract.clientId !== clientUserId) {
        throw new ForbiddenError("Only the contract's client can approve this milestone");
      }
      if (milestone.contract.status !== "ACTIVE") {
        throw new ConflictError("Contract is not active");
      }

      const released = await prisma.$transaction(async (tx) => {
        const result = await tx.milestone.updateMany({
          where: { id: milestoneId, status: "SUBMITTED" },
          data: { status: "RELEASED", approvedAt: new Date(), releasedAt: new Date() },
        });
        if (result.count === 0) {
          throw new ConflictError("Milestone is not awaiting approval");
        }

        await recordRelease(tx, milestone.contractId, milestoneId, milestone.amount);
        return tx.milestone.findUniqueOrThrow({ where: { id: milestoneId } });
      });

      await paymentPort.payout({
        contractId: milestone.contractId,
        milestoneId: milestone.id,
        amount: milestone.amount,
      });

      return released;
    },
  };
}

export type MilestonesService = ReturnType<typeof createMilestonesService>;
