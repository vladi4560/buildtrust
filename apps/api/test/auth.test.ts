import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";

describe("auth", () => {
  let app: FastifyInstance;
  const email = `test-${randomUUID()}@buildtrust.dev`;
  const password = "correct-horse-battery-staple";

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it("registers a new user and returns a token", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { fullName: "Test User", email, phone: "0500000000", password },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.token).toEqual(expect.any(String));
    expect(body.user.email).toBe(email);
    expect(body.user.role).toBeNull();
    expect(body.user).not.toHaveProperty("passwordHash");
  });

  it("rejects registering the same email twice", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { fullName: "Test User", email, phone: "0500000000", password },
    });

    expect(response.statusCode).toBe(409);
  });

  it("rejects login with the wrong password", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password: "wrong-password" },
    });

    expect(response.statusCode).toBe(401);
  });

  it("logs in with the correct password", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().token).toEqual(expect.any(String));
  });

  it("rejects /auth/me without a token", async () => {
    const response = await app.inject({ method: "GET", url: "/auth/me" });
    expect(response.statusCode).toBe(401);
  });

  it("returns the current user for /auth/me with a valid token", async () => {
    const loginResponse = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password },
    });
    const { token } = loginResponse.json();

    const meResponse = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(meResponse.statusCode).toBe(200);
    expect(meResponse.json().email).toBe(email);
  });

  it("sets the role via /auth/role", async () => {
    const loginResponse = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password },
    });
    const { token } = loginResponse.json();

    const roleResponse = await app.inject({
      method: "POST",
      url: "/auth/role",
      headers: { authorization: `Bearer ${token}` },
      payload: { role: "CLIENT" },
    });

    expect(roleResponse.statusCode).toBe(200);
    expect(roleResponse.json().role).toBe("CLIENT");
  });
});
