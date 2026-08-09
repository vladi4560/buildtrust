import type { Contract, LedgerEntry, Milestone, PrismaClient, Project, User } from "@prisma/client";

type EntryWithContext = LedgerEntry & {
  contract: Contract & { project: Project };
  milestone: Milestone | null;
};

function toTransactionDto(entry: EntryWithContext, sign: "+" | "-") {
  const projectTitle = entry.contract.project.title;
  const label =
    entry.type === "RELEASE"
      ? `${projectTitle} Milestone ${entry.milestone?.order ?? ""} Released`
      : entry.type === "RESERVE"
        ? `${projectTitle} Payment Reserved`
        : `${projectTitle} Refunded`;

  return {
    id: entry.id,
    type: entry.type as "RESERVE" | "RELEASE" | "REFUND",
    amount: entry.amount,
    sign,
    label,
    contractId: entry.contractId,
    projectId: entry.contract.projectId,
    projectTitle,
    milestoneId: entry.milestoneId,
    milestoneTitle: entry.milestone?.title ?? null,
    createdAt: entry.createdAt,
  };
}

export function createWalletService(prisma: PrismaClient) {
  return {
    async getForUser(user: Pick<User, "id" | "role">) {
      if (user.role === "PROFESSIONAL") {
        const entries = await prisma.ledgerEntry.findMany({
          where: { type: "RELEASE", contract: { professionalId: user.id } },
          include: { contract: { include: { project: true } }, milestone: true },
          orderBy: { createdAt: "desc" },
        });

        const balance = entries.reduce((sum, entry) => sum + entry.amount, 0);
        return { balance, transactions: entries.map((entry) => toTransactionDto(entry, "+")) };
      }

      const [entries, totals] = await Promise.all([
        prisma.ledgerEntry.findMany({
          where: {
            type: { in: ["RESERVE", "RELEASE", "REFUND"] },
            contract: { clientId: user.id },
          },
          include: { contract: { include: { project: true } }, milestone: true },
          orderBy: { createdAt: "desc" },
        }),
        prisma.ledgerEntry.groupBy({
          by: ["type"],
          where: { contract: { clientId: user.id } },
          _sum: { amount: true },
        }),
      ]);

      const deposited = totals.find((t) => t.type === "DEPOSIT")?._sum.amount ?? 0;
      const released = totals.find((t) => t.type === "RELEASE")?._sum.amount ?? 0;
      const refunded = totals.find((t) => t.type === "REFUND")?._sum.amount ?? 0;
      const balance = deposited - released - refunded;

      const transactions = entries.map((entry) =>
        toTransactionDto(entry, entry.type === "RESERVE" ? "-" : "+"),
      );

      return { balance, transactions };
    },
  };
}

export type WalletService = ReturnType<typeof createWalletService>;
