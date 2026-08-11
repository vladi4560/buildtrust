import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";

const CATEGORY_TAXONOMY = [
  "Electrical",
  "Plumbing",
  "Flooring",
  "Painting",
  "HVAC",
  "Carpentry",
  "Kitchens",
  "Structural",
  "Waterproofing",
  "Aluminum & Glass",
  "Drywall",
];

describe("discover marketplace", () => {
  let app: FastifyInstance;
  let clientId: string;
  let clientToken: string;
  let proElectricalId: string;
  let proPaintingId: string;
  let proFlooringId: string;
  const projectIds: string[] = [];

  async function makeReviewedPro(opts: {
    fullName: string;
    specialty: string;
    categorySlug: string;
    dailyRate: number;
    rating: number;
  }) {
    const category = await app.prisma.category.findUniqueOrThrow({
      where: { slug: opts.categorySlug },
    });
    const pro = await app.prisma.user.create({
      data: {
        role: "PROFESSIONAL",
        fullName: opts.fullName,
        email: `discover-${randomUUID()}@buildtrust.dev`,
        passwordHash: "unused",
        verified: true,
      },
    });
    await app.prisma.professionalProfile.create({
      data: {
        userId: pro.id,
        specialty: opts.specialty,
        yearsExperience: 2,
        skills: [],
        dailyRate: opts.dailyRate,
        available: true,
      },
    });
    await app.prisma.professionalCategory.create({
      data: { professionalId: pro.id, categoryId: category.id },
    });

    const project = await app.prisma.project.create({
      data: { clientId, title: `${opts.fullName} project`, budgetPlanned: 100_00 },
    });
    projectIds.push(project.id);
    const contract = await app.prisma.contract.create({
      data: {
        projectId: project.id,
        clientId,
        professionalId: pro.id,
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
        authorId: clientId,
        subjectId: pro.id,
        direction: "CLIENT_TO_PRO",
        rating: opts.rating,
      },
    });

    return pro.id;
  }

  beforeAll(async () => {
    app = await buildApp();

    const client = await app.prisma.user.create({
      data: {
        role: "CLIENT",
        fullName: "Discover Test Client",
        email: `discover-client-${randomUUID()}@buildtrust.dev`,
        passwordHash: "unused",
      },
    });
    clientId = client.id;
    clientToken = app.jwt.sign({ sub: client.id });

    proPaintingId = await makeReviewedPro({
      fullName: "Zed Painter",
      specialty: "Wall Painting",
      categorySlug: "painting",
      dailyRate: 500_00,
      rating: 3,
    });
    proElectricalId = await makeReviewedPro({
      fullName: "Amy Sparks",
      specialty: "Electrical Repairs",
      categorySlug: "electrical",
      dailyRate: 300_00,
      rating: 5,
    });
    proFlooringId = await makeReviewedPro({
      fullName: "Midge Floors",
      specialty: "Flooring Install",
      categorySlug: "flooring",
      dailyRate: 700_00,
      rating: 4,
    });
  });

  afterAll(async () => {
    await app.prisma.project.deleteMany({ where: { id: { in: projectIds } } });
    await app.prisma.user.deleteMany({
      where: { id: { in: [clientId, proPaintingId, proElectricalId, proFlooringId] } },
    });
    await app.close();
  });

  it("returns the full seeded category taxonomy", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/categories",
      headers: { authorization: `Bearer ${clientToken}` },
    });
    expect(response.statusCode).toBe(200);
    const names: string[] = response.json().map((c: { name: string }) => c.name);
    for (const name of CATEGORY_TAXONOMY) {
      expect(names).toContain(name);
    }
  });

  it("filters professionals by category", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/professionals?category=electrical",
      headers: { authorization: `Bearer ${clientToken}` },
    });
    expect(response.statusCode).toBe(200);
    const ids = response.json().map((p: { id: string }) => p.id);
    expect(ids).toContain(proElectricalId);
    expect(ids).not.toContain(proPaintingId);
    expect(ids).not.toContain(proFlooringId);
  });

  it("matches search on full name", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/professionals?search=Sparks",
      headers: { authorization: `Bearer ${clientToken}` },
    });
    const ids = response.json().map((p: { id: string }) => p.id);
    expect(ids).toEqual([proElectricalId]);
  });

  it("matches search on specialty", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/professionals?search=Flooring Install",
      headers: { authorization: `Bearer ${clientToken}` },
    });
    const ids = response.json().map((p: { id: string }) => p.id);
    expect(ids).toEqual([proFlooringId]);
  });

  it("sorts by rating descending", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/professionals?sort=rating",
      headers: { authorization: `Bearer ${clientToken}` },
    });
    const ids = response.json().map((p: { id: string }) => p.id);
    const ourIndexes = [proElectricalId, proFlooringId, proPaintingId].map((id) => ids.indexOf(id));
    expect(ourIndexes).toEqual([...ourIndexes].sort((a, b) => a - b));
  });

  it("sorts by price ascending", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/professionals?sort=price",
      headers: { authorization: `Bearer ${clientToken}` },
    });
    const ids = response.json().map((p: { id: string }) => p.id);
    const ourIndexes = [proElectricalId, proPaintingId, proFlooringId].map((id) => ids.indexOf(id));
    expect(ourIndexes).toEqual([...ourIndexes].sort((a, b) => a - b));
  });

  it("rejects an invalid sort value", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/professionals?sort=bogus",
      headers: { authorization: `Bearer ${clientToken}` },
    });
    expect(response.statusCode).toBe(400);
  });
});
