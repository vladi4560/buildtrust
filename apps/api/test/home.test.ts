import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { recordDeposit, recordRelease } from "../src/lib/ledger.js";

describe("home hub", () => {
  let app: FastifyInstance;
  let clientId: string;
  let clientToken: string;
  let professionalId: string;
  let draftContractId: string;
  let activeContractId: string;
  let releasedContractId: string;
  let submittedMilestoneId: string;
  const projectIds: string[] = [];

  beforeAll(async () => {
    app = await buildApp();

    const client = await app.prisma.user.create({
      data: {
        role: "CLIENT",
        fullName: "Home Test Client",
        email: `home-client-${randomUUID()}@buildtrust.dev`,
        passwordHash: "unused",
      },
    });
    clientId = client.id;
    clientToken = app.jwt.sign({ sub: client.id });

    const professional = await app.prisma.user.create({
      data: {
        role: "PROFESSIONAL",
        fullName: "Home Test Pro",
        email: `home-pro-${randomUUID()}@buildtrust.dev`,
        passwordHash: "unused",
      },
    });
    professionalId = professional.id;

    async function makeProject(title: string) {
      const project = await app.prisma.project.create({
        data: { clientId, title, budgetPlanned: 5000_00 },
      });
      projectIds.push(project.id);
      return project;
    }

    // Contract A: DRAFT, never deposited -> deposit_due action item.
    const projectA = await makeProject("Draft Needs Deposit");
    const contractA = await app.prisma.contract.create({
      data: {
        projectId: projectA.id,
        clientId,
        professionalId,
        amount: 1000_00,
        startDate: new Date(),
        estimatedEnd: new Date(),
        workingDays: 1,
        scope: "test",
        status: "DRAFT",
      },
    });
    draftContractId = contractA.id;

    // Contract B: ACTIVE, deposited, one milestone SUBMITTED -> milestone_approval action item.
    const projectB = await makeProject("Active Awaiting Approval");
    const contractB = await app.prisma.contract.create({
      data: {
        projectId: projectB.id,
        clientId,
        professionalId,
        amount: 2000_00,
        startDate: new Date(),
        estimatedEnd: new Date(),
        workingDays: 1,
        scope: "test",
        status: "ACTIVE",
      },
    });
    activeContractId = contractB.id;
    const milestoneB = await app.prisma.milestone.create({
      data: {
        contractId: contractB.id,
        order: 1,
        title: "First half",
        amount: 500_00,
        status: "SUBMITTED",
      },
    });
    submittedMilestoneId = milestoneB.id;
    await recordDeposit(app.prisma, contractB.id, 2000_00);

    // Contract C: ACTIVE, deposited, milestone already RELEASED -> no action item.
    const projectC = await makeProject("Fully Released");
    const contractC = await app.prisma.contract.create({
      data: {
        projectId: projectC.id,
        clientId,
        professionalId,
        amount: 1500_00,
        startDate: new Date(),
        estimatedEnd: new Date(),
        workingDays: 1,
        scope: "test",
        status: "ACTIVE",
      },
    });
    releasedContractId = contractC.id;
    const milestoneC = await app.prisma.milestone.create({
      data: {
        contractId: contractC.id,
        order: 1,
        title: "Only milestone",
        amount: 1500_00,
        status: "RELEASED",
      },
    });
    await recordDeposit(app.prisma, contractC.id, 1500_00);
    await recordRelease(app.prisma, contractC.id, milestoneC.id, 1500_00);
  });

  afterAll(async () => {
    await app.prisma.project.deleteMany({ where: { id: { in: projectIds } } });
    await app.prisma.user.deleteMany({ where: { id: { in: [clientId, professionalId] } } });
    await app.close();
  });

  it("computes an agorot-accurate summary that reconciles against committed", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/home/summary",
      headers: { authorization: `Bearer ${clientToken}` },
    });
    expect(response.statusCode).toBe(200);
    const summary = response.json();

    expect(summary.committed).toBe(1000_00 + 2000_00 + 1500_00);
    expect(summary.released).toBe(1500_00);
    expect(summary.inEscrow).toBe(2000_00);
    expect(summary.remaining).toBe(1000_00);
    expect(summary.released + summary.inEscrow + summary.remaining).toBe(summary.committed);
  });

  it("returns exactly the pending approvals and unfunded contracts", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/me/action-items",
      headers: { authorization: `Bearer ${clientToken}` },
    });
    expect(response.statusCode).toBe(200);
    const items = response.json();

    expect(items).toHaveLength(2);

    const depositItem = items.find((i: { kind: string }) => i.kind === "deposit_due");
    expect(depositItem).toMatchObject({ contractId: draftContractId, amountDue: 1000_00 });

    const approvalItem = items.find((i: { kind: string }) => i.kind === "milestone_approval");
    expect(approvalItem).toMatchObject({
      contractId: activeContractId,
      milestoneId: submittedMilestoneId,
      amount: 500_00,
    });

    const releasedContractIds = items.map((i: { contractId: string }) => i.contractId);
    expect(releasedContractIds).not.toContain(releasedContractId);
  });

  it("approving a milestone via the action moves released/inEscrow and drops the item", async () => {
    const approve = await app.inject({
      method: "POST",
      url: `/milestones/${submittedMilestoneId}/approve`,
      headers: { authorization: `Bearer ${clientToken}` },
    });
    expect(approve.statusCode).toBe(200);

    const summaryResponse = await app.inject({
      method: "GET",
      url: "/home/summary",
      headers: { authorization: `Bearer ${clientToken}` },
    });
    const summary = summaryResponse.json();
    expect(summary.released).toBe(1500_00 + 500_00);
    expect(summary.inEscrow).toBe(2000_00 - 500_00);
    expect(summary.remaining).toBe(1000_00);

    const itemsResponse = await app.inject({
      method: "GET",
      url: "/me/action-items",
      headers: { authorization: `Bearer ${clientToken}` },
    });
    const items = itemsResponse.json();
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe("deposit_due");
  });
});
