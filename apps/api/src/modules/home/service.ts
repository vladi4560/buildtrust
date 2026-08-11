import type { PrismaClient } from "@prisma/client";

export function createHomeService(prisma: PrismaClient) {
  return {
    /**
     * committed = total value of every contract the client has (any status).
     * released/inEscrow are derived from the ledger the same way wallet.ts
     * computes them. remaining is deliberately DERIVED (not independently
     * queried) so `released + inEscrow + remaining === committed` holds by
     * construction rather than by coincidence.
     */
    async getSummary(userId: string) {
      const contracts = await prisma.contract.findMany({
        where: { clientId: userId },
        select: { amount: true },
      });
      const committed = contracts.reduce((sum, contract) => sum + contract.amount, 0);

      const ledgerTotals = await prisma.ledgerEntry.groupBy({
        by: ["type"],
        where: { contract: { clientId: userId } },
        _sum: { amount: true },
      });
      const deposited = ledgerTotals.find((t) => t.type === "DEPOSIT")?._sum.amount ?? 0;
      const released = ledgerTotals.find((t) => t.type === "RELEASE")?._sum.amount ?? 0;
      const refunded = ledgerTotals.find((t) => t.type === "REFUND")?._sum.amount ?? 0;
      const inEscrow = deposited - released - refunded;
      const remaining = committed - released - inEscrow;

      return { released, inEscrow, remaining, committed };
    },

    async getActionItems(userId: string) {
      const [submittedMilestones, draftContracts] = await Promise.all([
        prisma.milestone.findMany({
          where: { status: "SUBMITTED", contract: { clientId: userId } },
          include: { contract: { include: { project: true } } },
        }),
        prisma.contract.findMany({
          where: { status: "DRAFT", clientId: userId },
          include: { project: true },
        }),
      ]);

      const approvalItems = submittedMilestones.map((milestone) => ({
        kind: "milestone_approval" as const,
        contractId: milestone.contractId,
        milestoneId: milestone.id,
        projectId: milestone.contract.projectId,
        projectTitle: milestone.contract.project.title,
        milestoneTitle: milestone.title,
        amount: milestone.amount,
      }));

      const depositItems = draftContracts.map((contract) => ({
        kind: "deposit_due" as const,
        contractId: contract.id,
        projectId: contract.projectId,
        projectTitle: contract.project.title,
        amountDue: contract.amount,
      }));

      return [...approvalItems, ...depositItems];
    },
  };
}

export type HomeService = ReturnType<typeof createHomeService>;
