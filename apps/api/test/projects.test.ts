import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { recordDeposit, recordRelease } from "../src/lib/ledger.js";

describe("projects", () => {
  let app: FastifyInstance;
  let clientId: string;
  let clientToken: string;
  let professionalId: string;
  let professionalToken: string;
  let projectId: string;

  beforeAll(async () => {
    app = await buildApp();

    const client = await app.prisma.user.create({
      data: {
        role: "CLIENT",
        fullName: "Projects Test Client",
        email: `proj-client-${randomUUID()}@buildtrust.dev`,
        passwordHash: "unused",
      },
    });
    clientId = client.id;
    clientToken = app.jwt.sign({ sub: client.id });

    const professional = await app.prisma.user.create({
      data: {
        role: "PROFESSIONAL",
        fullName: "Projects Test Pro",
        email: `proj-pro-${randomUUID()}@buildtrust.dev`,
        passwordHash: "unused",
      },
    });
    professionalId = professional.id;
    professionalToken = app.jwt.sign({ sub: professional.id });
  });

  afterAll(async () => {
    await app.prisma.project.deleteMany({ where: { clientId } });
    await app.prisma.user.deleteMany({ where: { id: { in: [clientId, professionalId] } } });
    await app.close();
  });

  it("lets a client create a project", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/projects",
      headers: { authorization: `Bearer ${clientToken}` },
      payload: { title: "New Deck", budgetPlanned: 500_00 },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.title).toBe("New Deck");
    expect(body.status).toBe("PLANNING");
    expect(body.spent).toBe(0);
    projectId = body.id;
  });

  it("rejects project creation from a professional", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/projects",
      headers: { authorization: `Bearer ${professionalToken}` },
      payload: { title: "Not allowed", budgetPlanned: 100_00 },
    });
    expect(response.statusCode).toBe(403);
  });

  it("lists the client's own projects", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/projects",
      headers: { authorization: `Bearer ${clientToken}` },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().some((p: { id: string }) => p.id === projectId)).toBe(true);
  });

  it("computes progress percent from released milestone amounts", async () => {
    const contract = await app.prisma.contract.create({
      data: {
        projectId,
        clientId,
        professionalId,
        amount: 500_00,
        startDate: new Date(),
        estimatedEnd: new Date(),
        workingDays: 3,
        scope: "test",
        status: "ACTIVE",
      },
    });
    const milestone = await app.prisma.milestone.create({
      data: {
        contractId: contract.id,
        order: 1,
        title: "Half",
        amount: 250_00,
        status: "RELEASED",
      },
    });
    await recordDeposit(app.prisma, contract.id, 500_00);
    await recordRelease(app.prisma, contract.id, milestone.id, 250_00);

    const response = await app.inject({
      method: "GET",
      url: `/projects/${projectId}`,
      headers: { authorization: `Bearer ${clientToken}` },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.spent).toBe(250_00);
    expect(body.progressPercent).toBe(50);
    expect(body.activeContract.id).toBe(contract.id);
    expect(body.activeContract.milestones).toHaveLength(1);
  });

  it("denies access to a project the requester has no relationship to", async () => {
    const stranger = await app.prisma.user.create({
      data: {
        role: "CLIENT",
        fullName: "Stranger",
        email: `stranger-${randomUUID()}@buildtrust.dev`,
        passwordHash: "unused",
      },
    });
    const strangerToken = app.jwt.sign({ sub: stranger.id });

    const response = await app.inject({
      method: "GET",
      url: `/projects/${projectId}`,
      headers: { authorization: `Bearer ${strangerToken}` },
    });
    expect(response.statusCode).toBe(403);

    await app.prisma.user.delete({ where: { id: stranger.id } });
  });

  it("returns the enriched summary shape (contractor, nextMilestone, progress, spent) in the list endpoint", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/projects",
      headers: { authorization: `Bearer ${clientToken}` },
    });
    expect(response.statusCode).toBe(200);
    const project = response
      .json()
      .find((p: { id: string }) => p.id === projectId);
    expect(project.contractor.id).toBe(professionalId);
    expect(project.spent).toBe(250_00);
    expect(project.progressPercent).toBe(50);
    expect(project.nextMilestone).toBeNull();
  });

  it("filters by status and defaults to all statuses when omitted", async () => {
    await app.prisma.project.update({
      where: { id: projectId },
      data: { status: "IN_PROGRESS" },
    });
    const planningProject = await app.prisma.project.create({
      data: {
        clientId,
        title: "Filter Test Planning",
        budgetPlanned: 100_00,
        status: "PLANNING",
      },
    });

    const inProgress = await app.inject({
      method: "GET",
      url: "/projects?status=IN_PROGRESS",
      headers: { authorization: `Bearer ${clientToken}` },
    });
    const inProgressIds = inProgress.json().map((p: { id: string }) => p.id);
    expect(inProgressIds).toContain(projectId);
    expect(inProgressIds).not.toContain(planningProject.id);

    const planning = await app.inject({
      method: "GET",
      url: "/projects?status=PLANNING",
      headers: { authorization: `Bearer ${clientToken}` },
    });
    const planningIds = planning.json().map((p: { id: string }) => p.id);
    expect(planningIds).toContain(planningProject.id);
    expect(planningIds).not.toContain(projectId);

    const all = await app.inject({
      method: "GET",
      url: "/projects",
      headers: { authorization: `Bearer ${clientToken}` },
    });
    const allIds = all.json().map((p: { id: string }) => p.id);
    expect(allIds).toContain(projectId);
    expect(allIds).toContain(planningProject.id);
  });

  it("only ever returns the requesting user's own projects", async () => {
    const otherClient = await app.prisma.user.create({
      data: {
        role: "CLIENT",
        fullName: "Other Client",
        email: `other-client-${randomUUID()}@buildtrust.dev`,
        passwordHash: "unused",
      },
    });
    const otherToken = app.jwt.sign({ sub: otherClient.id });
    const otherProject = await app.prisma.project.create({
      data: { clientId: otherClient.id, title: "Someone Else's Project", budgetPlanned: 200_00 },
    });

    const ownList = await app.inject({
      method: "GET",
      url: "/projects",
      headers: { authorization: `Bearer ${clientToken}` },
    });
    expect(ownList.json().some((p: { id: string }) => p.id === otherProject.id)).toBe(false);

    const otherList = await app.inject({
      method: "GET",
      url: "/projects",
      headers: { authorization: `Bearer ${otherToken}` },
    });
    const otherIds = otherList.json().map((p: { id: string }) => p.id);
    expect(otherIds).toContain(otherProject.id);
    expect(otherIds).not.toContain(projectId);

    await app.prisma.project.delete({ where: { id: otherProject.id } });
    await app.prisma.user.delete({ where: { id: otherClient.id } });
  });
});
