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
  const extraUserIds: string[] = [];
  const extraProjectIds: string[] = [];

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
    await app.prisma.project.deleteMany({ where: { id: { in: [projectId, ...extraProjectIds] } } });
    await app.prisma.user.deleteMany({
      where: { id: { in: [clientId, professionalId, ...extraUserIds] } },
    });
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

  it("derives projectsCount and onTimePercent from underlying contracts/milestones", async () => {
    const pro = await app.prisma.user.create({
      data: {
        role: "PROFESSIONAL",
        fullName: "Derived Stats Pro",
        email: `derived-pro-${randomUUID()}@buildtrust.dev`,
        passwordHash: "unused",
      },
    });
    extraUserIds.push(pro.id);
    await app.prisma.professionalProfile.create({
      data: { userId: pro.id, specialty: "Testing", yearsExperience: 1, skills: [] },
    });

    const project = await app.prisma.project.create({
      data: { clientId, title: "Derived Stats Project", budgetPlanned: 300_00 },
    });
    extraProjectIds.push(project.id);

    // A DRAFT contract never started - excluded from projectsCount.
    await app.prisma.contract.create({
      data: {
        projectId: project.id,
        clientId,
        professionalId: pro.id,
        amount: 100_00,
        startDate: new Date(),
        estimatedEnd: new Date(),
        workingDays: 1,
        scope: "test",
        status: "DRAFT",
      },
    });

    // An ACTIVE contract with one on-time and one late RELEASED milestone.
    const activeContract = await app.prisma.contract.create({
      data: {
        projectId: project.id,
        clientId,
        professionalId: pro.id,
        amount: 200_00,
        startDate: new Date(),
        estimatedEnd: new Date(),
        workingDays: 1,
        scope: "test",
        status: "ACTIVE",
      },
    });
    await app.prisma.milestone.create({
      data: {
        contractId: activeContract.id,
        order: 1,
        title: "On time",
        amount: 100_00,
        status: "RELEASED",
        dueDate: new Date("2024-01-10"),
        submittedAt: new Date("2024-01-09"),
      },
    });
    await app.prisma.milestone.create({
      data: {
        contractId: activeContract.id,
        order: 2,
        title: "Late",
        amount: 100_00,
        status: "RELEASED",
        dueDate: new Date("2024-01-10"),
        submittedAt: new Date("2024-01-15"),
      },
    });

    const response = await app.inject({
      method: "GET",
      url: `/professionals/${pro.id}`,
      headers: { authorization: `Bearer ${clientToken}` },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.projectsCount).toBe(1);
    expect(body.onTimePercent).toBe(50);
  });

  it("returns a review breakdown that sums to the total with a matching average", async () => {
    const subject = await app.prisma.user.create({
      data: {
        role: "PROFESSIONAL",
        fullName: "Breakdown Subject",
        email: `breakdown-subject-${randomUUID()}@buildtrust.dev`,
        passwordHash: "unused",
      },
    });
    extraUserIds.push(subject.id);

    const project = await app.prisma.project.create({
      data: { clientId, title: "Breakdown Project", budgetPlanned: 500_00 },
    });
    extraProjectIds.push(project.id);

    const ratings = [5, 5, 5, 4, 3, 2];
    for (const rating of ratings) {
      const author = await app.prisma.user.create({
        data: {
          role: "CLIENT",
          fullName: "Breakdown Author",
          email: `breakdown-author-${randomUUID()}@buildtrust.dev`,
          passwordHash: "unused",
        },
      });
      extraUserIds.push(author.id);

      const contract = await app.prisma.contract.create({
        data: {
          projectId: project.id,
          clientId: author.id,
          professionalId: subject.id,
          amount: 10_00,
          startDate: new Date(),
          estimatedEnd: new Date(),
          workingDays: 1,
          scope: "test",
          status: "COMPLETED",
        },
      });

      await app.inject({
        method: "POST",
        url: "/reviews",
        headers: { authorization: `Bearer ${app.jwt.sign({ sub: author.id })}` },
        payload: { contractId: contract.id, rating },
      });
    }

    const response = await app.inject({
      method: "GET",
      url: `/users/${subject.id}/reviews`,
      headers: { authorization: `Bearer ${clientToken}` },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();

    expect(body.count).toBe(ratings.length);
    const breakdownSum =
      body.breakdown["5"] + body.breakdown["4"] + body.breakdown["3"] + body.breakdown["2"] + body.breakdown["1"];
    expect(breakdownSum).toBe(ratings.length);
    expect(body.breakdown["5"]).toBe(3);
    expect(body.breakdown["4"]).toBe(1);
    expect(body.breakdown["3"]).toBe(1);
    expect(body.breakdown["2"]).toBe(1);

    const expectedAverage = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
    expect(body.average).toBeCloseTo(expectedAverage);
  });

  it("paginates the reviews list with before/limit and hasMore", async () => {
    const subject = await app.prisma.user.create({
      data: {
        role: "PROFESSIONAL",
        fullName: "Pagination Subject",
        email: `pagination-subject-${randomUUID()}@buildtrust.dev`,
        passwordHash: "unused",
      },
    });
    extraUserIds.push(subject.id);

    const project = await app.prisma.project.create({
      data: { clientId, title: "Pagination Project", budgetPlanned: 500_00 },
    });
    extraProjectIds.push(project.id);

    const base = Date.now();
    for (let i = 0; i < 3; i += 1) {
      const author = await app.prisma.user.create({
        data: {
          role: "CLIENT",
          fullName: `Pagination Author ${i}`,
          email: `pagination-author-${randomUUID()}@buildtrust.dev`,
          passwordHash: "unused",
        },
      });
      extraUserIds.push(author.id);

      const contract = await app.prisma.contract.create({
        data: {
          projectId: project.id,
          clientId: author.id,
          professionalId: subject.id,
          amount: 10_00,
          startDate: new Date(),
          estimatedEnd: new Date(),
          workingDays: 1,
          scope: "test",
          status: "COMPLETED",
        },
      });
      await app.prisma.review.create({
        data: {
          contractId: contract.id,
          authorId: author.id,
          subjectId: subject.id,
          direction: "CLIENT_TO_PRO",
          rating: 5,
          comment: `review-${i}`,
          createdAt: new Date(base + i * 60_000),
        },
      });
    }

    const page1 = await app.inject({
      method: "GET",
      url: `/users/${subject.id}/reviews?limit=2`,
      headers: { authorization: `Bearer ${clientToken}` },
    });
    const page1Body = page1.json();
    expect(page1Body.reviews.map((r: { comment: string }) => r.comment)).toEqual([
      "review-2",
      "review-1",
    ]);
    expect(page1Body.hasMore).toBe(true);
    expect(page1Body.count).toBe(3);

    const page2 = await app.inject({
      method: "GET",
      url: `/users/${subject.id}/reviews?limit=2&before=${page1Body.reviews[1].createdAt}`,
      headers: { authorization: `Bearer ${clientToken}` },
    });
    const page2Body = page2.json();
    expect(page2Body.reviews.map((r: { comment: string }) => r.comment)).toEqual(["review-0"]);
    expect(page2Body.hasMore).toBe(false);
  });

  it("ignores disallowed fields on PATCH /me and only ever updates the caller", async () => {
    const before = await app.prisma.user.findUniqueOrThrow({ where: { id: professionalId } });

    const response = await app.inject({
      method: "PATCH",
      url: "/me",
      headers: { authorization: `Bearer ${clientToken}` },
      payload: {
        fullName: "Renamed Client",
        role: "PROFESSIONAL",
        verified: true,
        passwordHash: "hacked",
      },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();

    expect(body.fullName).toBe("Renamed Client");
    expect(body.verified).toBe(false);
    expect(body.role).toBe("CLIENT");

    const professionalAfter = await app.prisma.user.findUniqueOrThrow({
      where: { id: professionalId },
    });
    expect(professionalAfter.fullName).toBe(before.fullName);
    expect(professionalAfter.passwordHash).toBe(before.passwordHash);
  });
});
