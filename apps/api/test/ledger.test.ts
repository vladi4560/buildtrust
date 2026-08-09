import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import {
  getContractLedgerTotals,
  recordDeposit,
  recordRelease,
  recordReserve,
} from "../src/lib/ledger.js";

describe("escrow ledger invariants", () => {
  let app: FastifyInstance;
  let clientId: string;
  let professionalId: string;
  let projectId: string;

  beforeAll(async () => {
    app = await buildApp();

    const client = await app.prisma.user.create({
      data: {
        role: "CLIENT",
        fullName: "Ledger Test Client",
        email: `ledger-client-${randomUUID()}@buildtrust.dev`,
        passwordHash: "unused",
      },
    });
    const professional = await app.prisma.user.create({
      data: {
        role: "PROFESSIONAL",
        fullName: "Ledger Test Pro",
        email: `ledger-pro-${randomUUID()}@buildtrust.dev`,
        passwordHash: "unused",
      },
    });
    const project = await app.prisma.project.create({
      data: { clientId: client.id, title: "Ledger Test Project", budgetPlanned: 1000_00 },
    });

    clientId = client.id;
    professionalId = professional.id;
    projectId = project.id;
  });

  afterAll(async () => {
    await app.prisma.project.deleteMany({ where: { id: projectId } });
    await app.prisma.user.deleteMany({ where: { id: { in: [clientId, professionalId] } } });
    await app.close();
  });

  async function makeContractWithMilestone(amount: number) {
    const contract = await app.prisma.contract.create({
      data: {
        projectId,
        clientId,
        professionalId,
        amount,
        startDate: new Date(),
        estimatedEnd: new Date(),
        workingDays: 5,
        scope: "test",
        status: "ACTIVE",
      },
    });
    const milestoneA = await app.prisma.milestone.create({
      data: { contractId: contract.id, order: 1, title: "M1", amount: Math.ceil(amount / 2) },
    });
    const milestoneB = await app.prisma.milestone.create({
      data: { contractId: contract.id, order: 2, title: "M2", amount: Math.floor(amount / 2) },
    });
    return { contract, milestoneA, milestoneB };
  }

  it("computes totals from deposit and reserve entries", async () => {
    const { contract, milestoneA } = await makeContractWithMilestone(1000_00);
    await recordDeposit(app.prisma, contract.id, 1000_00);
    await recordReserve(app.prisma, contract.id, milestoneA.id, 1000_00);

    const totals = await getContractLedgerTotals(app.prisma, contract.id);
    expect(totals.deposited).toBe(1000_00);
    expect(totals.reserved).toBe(1000_00);
    expect(totals.released).toBe(0);
    expect(totals.escrowBalance).toBe(1000_00);
  });

  it("releases funds and decreases the escrow balance", async () => {
    const { contract, milestoneA } = await makeContractWithMilestone(1000_00);
    await recordDeposit(app.prisma, contract.id, 1000_00);
    await recordRelease(app.prisma, contract.id, milestoneA.id, 400_00);

    const totals = await getContractLedgerTotals(app.prisma, contract.id);
    expect(totals.released).toBe(400_00);
    expect(totals.escrowBalance).toBe(600_00);
  });

  it("rejects a release that would exceed the contract's deposited funds", async () => {
    const { contract, milestoneA, milestoneB } = await makeContractWithMilestone(1000_00);
    await recordDeposit(app.prisma, contract.id, 1000_00);
    await recordRelease(app.prisma, contract.id, milestoneA.id, 700_00);

    await expect(recordRelease(app.prisma, contract.id, milestoneB.id, 400_00)).rejects.toThrow(
      /exceed/i,
    );

    const totals = await getContractLedgerTotals(app.prisma, contract.id);
    expect(totals.released).toBe(700_00);
  });

  it("rejects a release on a contract with no deposit at all", async () => {
    const { contract, milestoneA } = await makeContractWithMilestone(1000_00);
    await expect(recordRelease(app.prisma, contract.id, milestoneA.id, 1_00)).rejects.toThrow(
      /exceed/i,
    );
  });
});
