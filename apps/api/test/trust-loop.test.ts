import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";

/**
 * End-to-end exercise of BUILD_SPEC section 1's core trust loop, driven
 * entirely through the public HTTP API (register -> role -> project ->
 * contract -> deposit -> submit -> approve -> wallet -> review), the way a
 * real client would use it.
 */
describe("trust loop (end to end over HTTP)", () => {
  let app: FastifyInstance;
  const clientEmail = `trust-client-${randomUUID()}@buildtrust.dev`;
  const proEmail = `trust-pro-${randomUUID()}@buildtrust.dev`;
  let clientToken: string;
  let clientId: string;
  let professionalToken: string;
  let professionalId: string;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.prisma.project.deleteMany({ where: { clientId } });
    await app.prisma.user.deleteMany({ where: { email: { in: [clientEmail, proEmail] } } });
    await app.close();
  });

  it("runs the full loop", { timeout: 30000 }, async () => {
    // 1. Both parties register and pick a role.
    const clientRegister = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        fullName: "Trust Client",
        email: clientEmail,
        phone: "0500000001",
        password: "password123",
      },
    });
    expect(clientRegister.statusCode).toBe(201);
    clientToken = clientRegister.json().token;
    clientId = clientRegister.json().user.id;

    const clientRole = await app.inject({
      method: "POST",
      url: "/auth/role",
      headers: { authorization: `Bearer ${clientToken}` },
      payload: { role: "CLIENT" },
    });
    expect(clientRole.statusCode).toBe(200);

    const proRegister = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        fullName: "Trust Pro",
        email: proEmail,
        phone: "0500000002",
        password: "password123",
      },
    });
    expect(proRegister.statusCode).toBe(201);
    professionalToken = proRegister.json().token;
    professionalId = proRegister.json().user.id;

    const proRole = await app.inject({
      method: "POST",
      url: "/auth/role",
      headers: { authorization: `Bearer ${professionalToken}` },
      payload: { role: "PROFESSIONAL" },
    });
    expect(proRole.statusCode).toBe(200);

    // v1's HTTP surface has no professional-onboarding endpoint (BUILD_SPEC
    // section 6) -- profiles are seeded/admin-created. Fill one in directly
    // so this professional is visible via GET /professionals/:id below.
    await app.prisma.professionalProfile.create({
      data: {
        userId: professionalId,
        specialty: "General Contracting",
        yearsExperience: 4,
        skills: ["Fencing"],
        onTimePercent: 95,
        projectsCount: 0,
      },
    });

    // 2. Client posts a job.
    const project = await app.inject({
      method: "POST",
      url: "/projects",
      headers: { authorization: `Bearer ${clientToken}` },
      payload: { title: "Fence Repair", budgetPlanned: 600_00 },
    });
    expect(project.statusCode).toBe(201);
    const projectId = project.json().id;

    // 3. Client picks the professional and defines a contract with milestones.
    const contract = await app.inject({
      method: "POST",
      url: "/contracts",
      headers: { authorization: `Bearer ${clientToken}` },
      payload: {
        projectId,
        professionalId,
        amount: 600_00,
        startDate: "2024-08-01",
        estimatedEnd: "2024-08-05",
        workingDays: 4,
        scope: "Repair the back fence",
        milestones: [
          { title: "Materials", amount: 200_00 },
          { title: "Labor", amount: 400_00 },
        ],
      },
    });
    expect(contract.statusCode).toBe(201);
    const contractId = contract.json().id;
    const [milestone1, milestone2] = contract.json().milestones;

    // 4. Client deposits into escrow.
    const deposit = await app.inject({
      method: "POST",
      url: "/escrow/deposit",
      headers: { authorization: `Bearer ${clientToken}` },
      payload: { contractId },
    });
    expect(deposit.statusCode).toBe(200);
    expect(deposit.json().status).toBe("ACTIVE");

    // 5. Professional works and submits the first milestone; client approves it.
    const submit1 = await app.inject({
      method: "POST",
      url: `/milestones/${milestone1.id}/submit`,
      headers: { authorization: `Bearer ${professionalToken}` },
    });
    expect(submit1.statusCode).toBe(200);

    const approve1 = await app.inject({
      method: "POST",
      url: `/milestones/${milestone1.id}/approve`,
      headers: { authorization: `Bearer ${clientToken}` },
    });
    expect(approve1.statusCode).toBe(200);
    expect(approve1.json().status).toBe("RELEASED");

    // 6. Wallet reflects exactly the released amount, funds still held for milestone 2.
    const clientWalletMid = await app.inject({
      method: "GET",
      url: "/wallet",
      headers: { authorization: `Bearer ${clientToken}` },
    });
    expect(clientWalletMid.json().balance).toBe(400_00); // 600 deposited - 200 released

    const proWalletMid = await app.inject({
      method: "GET",
      url: "/wallet",
      headers: { authorization: `Bearer ${professionalToken}` },
    });
    expect(proWalletMid.json().balance).toBe(200_00);

    // 7. Second milestone goes through the same submit/approve flow.
    await app.inject({
      method: "POST",
      url: `/milestones/${milestone2.id}/submit`,
      headers: { authorization: `Bearer ${professionalToken}` },
    });
    const approve2 = await app.inject({
      method: "POST",
      url: `/milestones/${milestone2.id}/approve`,
      headers: { authorization: `Bearer ${clientToken}` },
    });
    expect(approve2.statusCode).toBe(200);

    // 8. Full amount now released to the professional; client's escrow is empty.
    const clientWalletFinal = await app.inject({
      method: "GET",
      url: "/wallet",
      headers: { authorization: `Bearer ${clientToken}` },
    });
    expect(clientWalletFinal.json().balance).toBe(0);

    const proWalletFinal = await app.inject({
      method: "GET",
      url: "/wallet",
      headers: { authorization: `Bearer ${professionalToken}` },
    });
    expect(proWalletFinal.json().balance).toBe(600_00);

    // 9. Both sides rate each other.
    const clientReview = await app.inject({
      method: "POST",
      url: "/reviews",
      headers: { authorization: `Bearer ${clientToken}` },
      payload: { contractId, rating: 5, comment: "Great job on the fence" },
    });
    expect(clientReview.statusCode).toBe(201);

    const proReview = await app.inject({
      method: "POST",
      url: "/reviews",
      headers: { authorization: `Bearer ${professionalToken}` },
      payload: { contractId, rating: 5, comment: "Paid promptly" },
    });
    expect(proReview.statusCode).toBe(201);

    const proProfile = await app.inject({
      method: "GET",
      url: `/professionals/${professionalId}`,
      headers: { authorization: `Bearer ${clientToken}` },
    });
    expect(proProfile.json().rating).toBe(5);
    expect(proProfile.json().reviewCount).toBe(1);
  });
});
