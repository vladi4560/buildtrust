import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";

describe("users & professionals", () => {
  let app: FastifyInstance;
  let clientId: string;
  let clientToken: string;
  let professionalId: string;
  let projectId: string;

  beforeAll(async () => {
    app = await buildApp();

    const client = await app.prisma.user.create({
      data: {
        role: "CLIENT",
        fullName: "Users Test Client",
        email: `up-client-${randomUUID()}@buildtrust.dev`,
        passwordHash: "unused",
      },
    });
    clientId = client.id;
    clientToken = app.jwt.sign({ sub: client.id });

    const professional = await app.prisma.user.create({
      data: {
        role: "PROFESSIONAL",
        fullName: "Users Test Pro",
        email: `up-pro-${randomUUID()}@buildtrust.dev`,
        passwordHash: "unused",
        verified: true,
      },
    });
    professionalId = professional.id;

    await app.prisma.professionalProfile.create({
      data: {
        userId: professional.id,
        specialty: "Painting",
        yearsExperience: 5,
        skills: ["Interior Painting", "Exterior Painting"],
        onTimePercent: 90,
        projectsCount: 1,
      },
    });
    await app.prisma.portfolioItem.create({
      data: { professionalId: professional.id, imageUrl: "https://example.com/a.jpg" },
    });

    const project = await app.prisma.project.create({
      data: { clientId: client.id, title: "Reviewable Project", budgetPlanned: 100_00 },
    });
    projectId = project.id;
    const contract = await app.prisma.contract.create({
      data: {
        projectId: project.id,
        clientId: client.id,
        professionalId: professional.id,
        amount: 100_00,
        startDate: new Date(),
        estimatedEnd: new Date(),
        workingDays: 1,
        scope: "test",
        status: "ACTIVE",
      },
    });
    await app.prisma.review.create({
      data: {
        contractId: contract.id,
        authorId: client.id,
        subjectId: professional.id,
        direction: "CLIENT_TO_PRO",
        rating: 5,
        comment: "Great work",
      },
    });
  });

  afterAll(async () => {
    await app.prisma.project.deleteMany({ where: { id: projectId } });
    await app.prisma.user.deleteMany({ where: { id: { in: [clientId, professionalId] } } });
    await app.close();
  });

  it("lists professionals filtered by skill", async () => {
    const hit = await app.inject({
      method: "GET",
      url: "/professionals?skill=Interior Painting",
      headers: { authorization: `Bearer ${clientToken}` },
    });
    expect(hit.statusCode).toBe(200);
    expect(hit.json().some((p: { id: string }) => p.id === professionalId)).toBe(true);

    const miss = await app.inject({
      method: "GET",
      url: "/professionals?skill=Nonexistent Skill",
      headers: { authorization: `Bearer ${clientToken}` },
    });
    expect(miss.json().some((p: { id: string }) => p.id === professionalId)).toBe(false);
  });

  it("returns a professional's profile with derived rating", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/professionals/${professionalId}`,
      headers: { authorization: `Bearer ${clientToken}` },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.specialty).toBe("Painting");
    expect(body.rating).toBe(5);
    expect(body.reviewCount).toBe(1);
  });

  it("returns a professional's portfolio", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/professionals/${professionalId}/portfolio`,
      headers: { authorization: `Bearer ${clientToken}` },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveLength(1);
  });

  it("returns a 404 for a professional that doesn't exist", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/professionals/does-not-exist",
      headers: { authorization: `Bearer ${clientToken}` },
    });
    expect(response.statusCode).toBe(404);
  });

  it("returns review breakdown and list for a user", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/users/${professionalId}/reviews`,
      headers: { authorization: `Bearer ${clientToken}` },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.count).toBe(1);
    expect(body.average).toBe(5);
    expect(body.breakdown["5"]).toBe(1);
    expect(body.reviews[0].comment).toBe("Great work");
  });

  it("updates the current user's profile via PATCH /me", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/me",
      headers: { authorization: `Bearer ${clientToken}` },
      payload: { bio: "Updated bio", location: "Tel Aviv" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().bio).toBe("Updated bio");
    expect(response.json().location).toBe("Tel Aviv");
  });

  it("prevents PATCH /me from taking an already-registered email", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/me",
      headers: { authorization: `Bearer ${clientToken}` },
      payload: {
        email: (await app.prisma.user.findUniqueOrThrow({ where: { id: professionalId } })).email,
      },
    });
    expect(response.statusCode).toBe(409);
  });
});
