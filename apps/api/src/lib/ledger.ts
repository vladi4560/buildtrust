import type { LedgerAccount, LedgerEntryType, Prisma, PrismaClient } from "@prisma/client";
import { ConflictError } from "./app-error.js";
import { assertPositiveAgorot } from "./money.js";

// Double-entry accounting convention (also used by prisma/seed.ts):
//   DEPOSIT  debit PLATFORM_HOLD  credit CLIENT_ESCROW         (cash enters the pool)
//   RESERVE  debit CLIENT_ESCROW  credit CLIENT_ESCROW         (net-zero milestone earmark, audit row only)
//   RELEASE  debit CLIENT_ESCROW  credit PROFESSIONAL_PAYABLE  (escrow -> professional)
//   REFUND   debit CLIENT_ESCROW  credit PLATFORM_HOLD         (escrow -> back out of the pool)
const LEDGER_ACCOUNTS: Record<LedgerEntryType, { debit: LedgerAccount; credit: LedgerAccount }> = {
  DEPOSIT: { debit: "PLATFORM_HOLD", credit: "CLIENT_ESCROW" },
  RESERVE: { debit: "CLIENT_ESCROW", credit: "CLIENT_ESCROW" },
  RELEASE: { debit: "CLIENT_ESCROW", credit: "PROFESSIONAL_PAYABLE" },
  REFUND: { debit: "CLIENT_ESCROW", credit: "PLATFORM_HOLD" },
};

export type DbClient = PrismaClient | Prisma.TransactionClient;

export interface ContractLedgerTotals {
  deposited: number;
  reserved: number;
  released: number;
  refunded: number;
  /** Funds still held in escrow for this contract: deposited - released - refunded. */
  escrowBalance: number;
}

export async function getContractLedgerTotals(
  db: DbClient,
  contractId: string,
): Promise<ContractLedgerTotals> {
  const groups = await db.ledgerEntry.groupBy({
    by: ["type"],
    where: { contractId },
    _sum: { amount: true },
  });

  const totals = { deposited: 0, reserved: 0, released: 0, refunded: 0 };
  for (const group of groups) {
    const amount = group._sum.amount ?? 0;
    if (group.type === "DEPOSIT") totals.deposited = amount;
    if (group.type === "RESERVE") totals.reserved = amount;
    if (group.type === "RELEASE") totals.released = amount;
    if (group.type === "REFUND") totals.refunded = amount;
  }

  return {
    ...totals,
    escrowBalance: totals.deposited - totals.released - totals.refunded,
  };
}

export async function recordDeposit(db: DbClient, contractId: string, amount: number) {
  assertPositiveAgorot(amount, "Deposit amount");
  const accounts = LEDGER_ACCOUNTS.DEPOSIT;
  return db.ledgerEntry.create({
    data: {
      contractId,
      type: "DEPOSIT",
      debitAccount: accounts.debit,
      creditAccount: accounts.credit,
      amount,
    },
  });
}

export async function recordReserve(
  db: DbClient,
  contractId: string,
  milestoneId: string,
  amount: number,
) {
  assertPositiveAgorot(amount, "Reserve amount");
  const accounts = LEDGER_ACCOUNTS.RESERVE;
  return db.ledgerEntry.create({
    data: {
      contractId,
      milestoneId,
      type: "RESERVE",
      debitAccount: accounts.debit,
      creditAccount: accounts.credit,
      amount,
    },
  });
}

/**
 * Records a RELEASE entry, enforcing the core escrow invariant: a contract
 * can never release more than it has taken in. Callers are responsible for
 * the "a milestone releases exactly once" invariant (enforced via an atomic
 * conditional status update on the Milestone row — see modules/milestones).
 */
export async function recordRelease(
  db: DbClient,
  contractId: string,
  milestoneId: string,
  amount: number,
) {
  assertPositiveAgorot(amount, "Release amount");

  const totals = await getContractLedgerTotals(db, contractId);
  if (totals.released + amount > totals.deposited) {
    throw new ConflictError("Release would exceed the contract's deposited funds");
  }

  const accounts = LEDGER_ACCOUNTS.RELEASE;
  return db.ledgerEntry.create({
    data: {
      contractId,
      milestoneId,
      type: "RELEASE",
      debitAccount: accounts.debit,
      creditAccount: accounts.credit,
      amount,
    },
  });
}

export async function recordRefund(db: DbClient, contractId: string, amount: number) {
  assertPositiveAgorot(amount, "Refund amount");

  const totals = await getContractLedgerTotals(db, contractId);
  if (amount > totals.escrowBalance) {
    throw new ConflictError("Refund would exceed the contract's available escrow balance");
  }

  const accounts = LEDGER_ACCOUNTS.REFUND;
  return db.ledgerEntry.create({
    data: {
      contractId,
      type: "REFUND",
      debitAccount: accounts.debit,
      creditAccount: accounts.credit,
      amount,
    },
  });
}
