import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";

describe("wallet & escrow", () => {
  let app: FastifyInstance;
  let clientId: string;
  let clientToken: string;
  let professionalId: string;
  let professionalToken: string;
  let projectId: string;
  let contractId: string;
  let milestoneId: string;

  beforeAll(async () => {
    app = await buildApp();

    const client = await app.prisma.user.create({
      data: {
        role: "CLIENT",
        fullName: "Wallet Test Client",
        email: `wallet-client-${randomUUID()}@buildtrust.dev`,
        passwordHash: "unused",
      },
    });
    clientId = client.id;
    clientToken = app.jwt.sign({ sub: client.id });

    const professional = await app.prisma.user.create({
      data: {
        role: "PROFESSIONAL",
        fullName: "Wallet Test Pro",
        email: `wallet-pro-${randomUUID()}@buildtrust.dev`,
        passwordHash: "unused",
      },
    });
    professionalId = professional.id;
    professionalToken = app.jwt.sign({ sub: professional.id });

    const project = await app.prisma.project.create({
      data: { clientId: client.id, title: "Wallet Test Project", budgetPlanned: 900_00 },
    });
    projectId = project.id;

    const contract = await app.prisma.contract.create({
      data: {
        projectId,
        clientId,
        professionalId,
        amount: 900_00,
        startDate: new Date(),
        estimatedEnd: new Date(),
        workingDays: 5,
        scope: "test",
        status: "DRAFT",
      },
    });
    contractId = contract.id;

    const milestone = await app.prisma.milestone.create({
      data: { contractId, order: 1, title: "Only Milestone", amount: 900_00 },
    });
    milestoneId = milestone.id;
  });

  afterAll(async () => {
    await app.prisma.project.deleteMany({ where: { id: projectId } });
    await app.prisma.user.deleteMany({ where: { id: { in: [clientId, professionalId] } } });
    await app.close();
  });

  it("rejects deposit from a non-client party", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/escrow/deposit",
      headers: { authorization: `Bearer ${professionalToken}` },
      payload: { contractId },
    });
    expect(response.statusCode).toBe(403);
  });

  it("deposits and activates the contract, reserving all milestones", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/escrow/deposit",
      headers: { authorization: `Bearer ${clientToken}` },
      payload: { contractId },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe("ACTIVE");
    expect(body.milestones[0].status).toBe("IN_PROGRESS");
  });

  it("rejects a second deposit on an already-active contract", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/escrow/deposit",
      headers: { authorization: `Bearer ${clientToken}` },
      payload: { contractId },
    });
    expect(response.statusCode).toBe(409);
  });

  it("shows the client's wallet balance and reserve transaction", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/wallet",
      headers: { authorization: `Bearer ${clientToken}` },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.balance).toBe(900_00);
    const reserveTx = body.transactions.find((t: { type: string }) => t.type === "RESERVE");
    expect(reserveTx).toBeDefined();
    expect(reserveTx.sign).toBe("-");
    expect(reserveTx.label).toContain("Payment Reserved");
  });

  it("reflects a released milestone in both parties' wallets", async () => {
    await app.inject({
      method: "POST",
      url: `/milestones/${milestoneId}/submit`,
      headers: { authorization: `Bearer ${professionalToken}` },
    });
    await app.inject({
      method: "POST",
      url: `/milestones/${milestoneId}/approve`,
      headers: { authorization: `Bearer ${clientToken}` },
    });

    const clientWallet = await app.inject({
      method: "GET",
      url: "/wallet",
      headers: { authorization: `Bearer ${clientToken}` },
    });
    expect(clientWallet.json().balance).toBe(0);
    const releaseTx = clientWallet
      .json()
      .transactions.find((t: { type: string }) => t.type === "RELEASE");
    expect(releaseTx.sign).toBe("+");
    expect(releaseTx.label).toContain("Milestone 1 Released");

    const proWallet = await app.inject({
      method: "GET",
      url: "/wallet",
      headers: { authorization: `Bearer ${professionalToken}` },
    });
    expect(proWallet.json().balance).toBe(900_00);
    expect(proWallet.json().transactions).toHaveLength(1);
  });
});
