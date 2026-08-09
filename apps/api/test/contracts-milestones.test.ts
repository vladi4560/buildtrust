import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { recordDeposit } from "../src/lib/ledger.js";

describe("contracts & milestones", () => {
  let app: FastifyInstance;
  let clientId: string;
  let clientToken: string;
  let professionalId: string;
  let professionalToken: string;
  let strangerToken: string;
  let strangerId: string;
  let projectId: string;
  let contractId: string;
  let milestoneId: string;

  beforeAll(async () => {
    app = await buildApp();

    const client = await app.prisma.user.create({
      data: {
        role: "CLIENT",
        fullName: "Contracts Test Client",
        email: `contract-client-${randomUUID()}@buildtrust.dev`,
        passwordHash: "unused",
      },
    });
    clientId = client.id;
    clientToken = app.jwt.sign({ sub: client.id });

    const professional = await app.prisma.user.create({
      data: {
        role: "PROFESSIONAL",
        fullName: "Contracts Test Pro",
        email: `contract-pro-${randomUUID()}@buildtrust.dev`,
        passwordHash: "unused",
      },
    });
    professionalId = professional.id;
    professionalToken = app.jwt.sign({ sub: professional.id });

    const stranger = await app.prisma.user.create({
      data: {
        role: "CLIENT",
        fullName: "Stranger",
        email: `contract-stranger-${randomUUID()}@buildtrust.dev`,
        passwordHash: "unused",
      },
    });
    strangerId = stranger.id;
    strangerToken = app.jwt.sign({ sub: stranger.id });

    const project = await app.prisma.project.create({
      data: { clientId: client.id, title: "Deck Build", budgetPlanned: 1000_00 },
    });
    projectId = project.id;
  });

  afterAll(async () => {
    await app.prisma.project.deleteMany({ where: { clientId } });
    await app.prisma.user.deleteMany({
      where: { id: { in: [clientId, professionalId, strangerId] } },
    });
    await app.close();
  });

  it("rejects mismatched milestone amounts", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/contracts",
      headers: { authorization: `Bearer ${clientToken}` },
      payload: {
        projectId,
        professionalId,
        amount: 1000_00,
        startDate: "2024-01-01",
        estimatedEnd: "2024-01-10",
        workingDays: 5,
        scope: "Build a deck",
        milestones: [{ title: "M1", amount: 400_00 }],
      },
    });
    expect(response.statusCode).toBe(400);
  });

  it("creates a DRAFT contract with ordered milestones", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/contracts",
      headers: { authorization: `Bearer ${clientToken}` },
      payload: {
        projectId,
        professionalId,
        amount: 1000_00,
        startDate: "2024-01-01",
        estimatedEnd: "2024-01-10",
        workingDays: 5,
        scope: "Build a deck",
        milestones: [
          { title: "Foundation", amount: 400_00 },
          { title: "Framing", amount: 600_00 },
        ],
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.status).toBe("DRAFT");
    expect(body.milestones).toHaveLength(2);
    expect(body.milestones[0].order).toBe(1);
    expect(body.milestones[1].order).toBe(2);

    contractId = body.id;
    milestoneId = body.milestones[0].id;
  });

  it("denies contract access to a stranger", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/contracts/${contractId}`,
      headers: { authorization: `Bearer ${strangerToken}` },
    });
    expect(response.statusCode).toBe(403);
  });

  it("rejects submit before the contract is active", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/milestones/${milestoneId}/submit`,
      headers: { authorization: `Bearer ${professionalToken}` },
    });
    expect(response.statusCode).toBe(409);
  });

  it("runs the submit -> approve flow once the contract is active", async () => {
    await app.prisma.contract.update({ where: { id: contractId }, data: { status: "ACTIVE" } });
    await recordDeposit(app.prisma, contractId, 1000_00);

    const wrongSubmitter = await app.inject({
      method: "POST",
      url: `/milestones/${milestoneId}/submit`,
      headers: { authorization: `Bearer ${clientToken}` },
    });
    expect(wrongSubmitter.statusCode).toBe(403);

    const submit = await app.inject({
      method: "POST",
      url: `/milestones/${milestoneId}/submit`,
      headers: { authorization: `Bearer ${professionalToken}` },
    });
    expect(submit.statusCode).toBe(200);
    expect(submit.json().status).toBe("SUBMITTED");

    const wrongApprover = await app.inject({
      method: "POST",
      url: `/milestones/${milestoneId}/approve`,
      headers: { authorization: `Bearer ${professionalToken}` },
    });
    expect(wrongApprover.statusCode).toBe(403);

    const approve = await app.inject({
      method: "POST",
      url: `/milestones/${milestoneId}/approve`,
      headers: { authorization: `Bearer ${clientToken}` },
    });
    expect(approve.statusCode).toBe(200);
    expect(approve.json().status).toBe("RELEASED");
    expect(approve.json().releasedAt).toEqual(expect.any(String));
  });

  it("refuses to release the same milestone twice", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/milestones/${milestoneId}/approve`,
      headers: { authorization: `Bearer ${clientToken}` },
    });
    expect(response.statusCode).toBe(409);

    const totals = await app.prisma.ledgerEntry.aggregate({
      where: { contractId, milestoneId, type: "RELEASE" },
      _sum: { amount: true },
      _count: true,
    });
    expect(totals._count).toBe(1);
    expect(totals._sum.amount).toBe(400_00);
  });
});
