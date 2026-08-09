import type { PrismaClient } from "@prisma/client";
import { ConflictError, ForbiddenError, NotFoundError } from "../../lib/app-error.js";
import { recordDeposit, recordReserve } from "../../lib/ledger.js";
import type { PaymentPort } from "../../lib/payment-port.js";

export function createEscrowService(prisma: PrismaClient, paymentPort: PaymentPort) {
  return {
    /**
     * Funds a DRAFT contract in full. Per the RESERVE-at-activation rule
     * (BUILD_SPEC section 5), the whole deposit is earmarked across every
     * milestone as soon as the contract goes ACTIVE.
     */
    async deposit(contractId: string, clientUserId: string) {
      const contract = await prisma.contract.findUnique({
        where: { id: contractId },
        include: { milestones: true },
      });
      if (!contract) {
        throw new NotFoundError("Contract not found");
      }
      if (contract.clientId !== clientUserId) {
        throw new ForbiddenError("Only the contract's client can fund escrow");
      }
      if (contract.status !== "DRAFT") {
        throw new ConflictError("Contract is not awaiting deposit");
      }

      await paymentPort.deposit({ contractId, amount: contract.amount });

      return prisma.$transaction(async (tx) => {
        await recordDeposit(tx, contractId, contract.amount);
        for (const milestone of contract.milestones) {
          await recordReserve(tx, contractId, milestone.id, milestone.amount);
        }
        await tx.contract.update({ where: { id: contractId }, data: { status: "ACTIVE" } });
        await tx.milestone.updateMany({
          where: { contractId, status: "PENDING" },
          data: { status: "IN_PROGRESS" },
        });

        return tx.contract.findUniqueOrThrow({
          where: { id: contractId },
          include: { milestones: { orderBy: { order: "asc" } } },
        });
      });
    },
  };
}

export type EscrowService = ReturnType<typeof createEscrowService>;
