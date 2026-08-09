import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";

describe("reviews", () => {
  let app: FastifyInstance;
  let clientId: string;
  let clientToken: string;
  let professionalId: string;
  let professionalToken: string;
  let strangerToken: string;
  let strangerId: string;
  let projectId: string;
  let contractId: string;

  beforeAll(async () => {
    app = await buildApp();

    const client = await app.prisma.user.create({
      data: {
        role: "CLIENT",
        fullName: "Reviews Test Client",
        email: `review-client-${randomUUID()}@buildtrust.dev`,
        passwordHash: "unused",
      },
    });
    clientId = client.id;
    clientToken = app.jwt.sign({ sub: client.id });

    const professional = await app.prisma.user.create({
      data: {
        role: "PROFESSIONAL",
        fullName: "Reviews Test Pro",
        email: `review-pro-${randomUUID()}@buildtrust.dev`,
        passwordHash: "unused",
      },
    });
    professionalId = professional.id;
    professionalToken = app.jwt.sign({ sub: professional.id });

    const stranger = await app.prisma.user.create({
      data: {
        role: "CLIENT",
        fullName: "Stranger",
        email: `review-stranger-${randomUUID()}@buildtrust.dev`,
        passwordHash: "unused",
      },
    });
    strangerId = stranger.id;
    strangerToken = app.jwt.sign({ sub: stranger.id });

    const project = await app.prisma.project.create({
      data: { clientId, title: "Reviews Test Project", budgetPlanned: 100_00 },
    });
    projectId = project.id;

    const contract = await app.prisma.contract.create({
      data: {
        projectId,
        clientId,
        professionalId,
        amount: 100_00,
        startDate: new Date(),
        estimatedEnd: new Date(),
        workingDays: 1,
        scope: "test",
        status: "COMPLETED",
      },
    });
    contractId = contract.id;
  });

  afterAll(async () => {
    await app.prisma.project.deleteMany({ where: { id: projectId } });
    await app.prisma.user.deleteMany({
      where: { id: { in: [clientId, professionalId, strangerId] } },
    });
    await app.close();
  });

  it("rejects a review from someone not party to the contract", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/reviews",
      headers: { authorization: `Bearer ${strangerToken}` },
      payload: { contractId, rating: 5 },
    });
    expect(response.statusCode).toBe(403);
  });

  it("lets the client review the professional (CLIENT_TO_PRO)", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/reviews",
      headers: { authorization: `Bearer ${clientToken}` },
      payload: { contractId, rating: 5, comment: "Excellent work" },
    });
    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.direction).toBe("CLIENT_TO_PRO");
    expect(body.subjectId).toBe(professionalId);
  });

  it("rejects a second review from the same author for the same contract", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/reviews",
      headers: { authorization: `Bearer ${clientToken}` },
      payload: { contractId, rating: 3 },
    });
    expect(response.statusCode).toBe(409);
  });

  it("lets the professional review the client (PRO_TO_CLIENT), independent of the client's review", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/reviews",
      headers: { authorization: `Bearer ${professionalToken}` },
      payload: { contractId, rating: 4, comment: "Clear communication" },
    });
    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.direction).toBe("PRO_TO_CLIENT");
    expect(body.subjectId).toBe(clientId);
  });
});
