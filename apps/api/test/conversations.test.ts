import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";

describe("messaging", () => {
  let app: FastifyInstance;
  let userAId: string;
  let userAToken: string;
  let userBId: string;
  let userBToken: string;
  let outsiderToken: string;
  const userIds: string[] = [];

  beforeAll(async () => {
    app = await buildApp();

    async function makeUser(fullName: string) {
      const user = await app.prisma.user.create({
        data: { fullName, email: `msg-${randomUUID()}@buildtrust.dev`, passwordHash: "unused" },
      });
      userIds.push(user.id);
      return { id: user.id, token: app.jwt.sign({ sub: user.id }) };
    }

    const userA = await makeUser("Conversation Test A");
    userAId = userA.id;
    userAToken = userA.token;

    const userB = await makeUser("Conversation Test B");
    userBId = userB.id;
    userBToken = userB.token;

    const outsider = await makeUser("Conversation Test Outsider");
    outsiderToken = outsider.token;
  });

  afterAll(async () => {
    await app.prisma.message.deleteMany({ where: { senderId: { in: userIds } } });
    await app.prisma.conversationParticipant.deleteMany({ where: { userId: { in: userIds } } });
    await app.prisma.conversation.deleteMany({
      where: { participants: { none: {} } },
    });
    await app.prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await app.close();
  });

  it("POST /conversations is idempotent for the same pair", async () => {
    const first = await app.inject({
      method: "POST",
      url: "/conversations",
      headers: { authorization: `Bearer ${userAToken}` },
      payload: { participantId: userBId },
    });
    expect(first.statusCode).toBe(200);
    const firstBody = first.json();

    const second = await app.inject({
      method: "POST",
      url: "/conversations",
      headers: { authorization: `Bearer ${userAToken}` },
      payload: { participantId: userBId },
    });
    expect(second.statusCode).toBe(200);
    expect(second.json().id).toBe(firstBody.id);

    const count = await app.prisma.conversation.count({
      where: {
        participants: { some: { userId: userAId } },
        AND: { participants: { some: { userId: userBId } } },
      },
    });
    expect(count).toBe(1);
  });

  it("messages return in chronological order and paginate", async () => {
    const conversation = await app.prisma.conversation.create({
      data: { participants: { create: [{ userId: userAId }, { userId: userBId }] } },
    });

    const base = Date.now();
    const bodies = ["m1", "m2", "m3", "m4", "m5"];
    for (const [index, body] of bodies.entries()) {
      await app.prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: userAId,
          body,
          createdAt: new Date(base + index * 60_000),
        },
      });
    }

    const page1 = await app.inject({
      method: "GET",
      url: `/conversations/${conversation.id}/messages?limit=2`,
      headers: { authorization: `Bearer ${userAToken}` },
    });
    expect(page1.statusCode).toBe(200);
    const page1Body = page1.json();
    expect(page1Body.messages.map((m: { body: string }) => m.body)).toEqual(["m4", "m5"]);
    expect(page1Body.hasMore).toBe(true);

    const page2 = await app.inject({
      method: "GET",
      url: `/conversations/${conversation.id}/messages?limit=2&before=${page1Body.messages[0].createdAt}`,
      headers: { authorization: `Bearer ${userAToken}` },
    });
    const page2Body = page2.json();
    expect(page2Body.messages.map((m: { body: string }) => m.body)).toEqual(["m2", "m3"]);
    expect(page2Body.hasMore).toBe(true);

    const page3 = await app.inject({
      method: "GET",
      url: `/conversations/${conversation.id}/messages?limit=2&before=${page2Body.messages[0].createdAt}`,
      headers: { authorization: `Bearer ${userAToken}` },
    });
    const page3Body = page3.json();
    expect(page3Body.messages.map((m: { body: string }) => m.body)).toEqual(["m1"]);
    expect(page3Body.hasMore).toBe(false);
  });

  it("sending appends a message and bumps lastMessageAt", async () => {
    const conversation = await app.prisma.conversation.create({
      data: {
        participants: { create: [{ userId: userAId }, { userId: userBId }] },
        lastMessageAt: new Date(0),
      },
    });

    const send = await app.inject({
      method: "POST",
      url: `/conversations/${conversation.id}/messages`,
      headers: { authorization: `Bearer ${userAToken}` },
      payload: { body: "hello there" },
    });
    expect(send.statusCode).toBe(201);
    expect(send.json()).toMatchObject({
      conversationId: conversation.id,
      senderId: userAId,
      body: "hello there",
    });

    const updated = await app.prisma.conversation.findUniqueOrThrow({
      where: { id: conversation.id },
    });
    expect(updated.lastMessageAt.getTime()).toBeGreaterThan(new Date(0).getTime());

    const messages = await app.prisma.message.findMany({
      where: { conversationId: conversation.id },
    });
    expect(messages).toHaveLength(1);
  });

  it("computes unread count against lastReadAt and POST /read zeroes it", async () => {
    const conversation = await app.prisma.conversation.create({
      data: { participants: { create: [{ userId: userAId }, { userId: userBId }] } },
    });

    async function sendAsA(body: string) {
      const response = await app.inject({
        method: "POST",
        url: `/conversations/${conversation.id}/messages`,
        headers: { authorization: `Bearer ${userAToken}` },
        payload: { body },
      });
      expect(response.statusCode).toBe(201);
    }

    async function unreadForB() {
      const response = await app.inject({
        method: "GET",
        url: "/conversations",
        headers: { authorization: `Bearer ${userBToken}` },
      });
      const list = response.json();
      const row = list.find((c: { id: string }) => c.id === conversation.id);
      return row.unreadCount as number;
    }

    await sendAsA("one");
    await sendAsA("two");
    await sendAsA("three");
    expect(await unreadForB()).toBe(3);

    const read = await app.inject({
      method: "POST",
      url: `/conversations/${conversation.id}/read`,
      headers: { authorization: `Bearer ${userBToken}` },
    });
    expect(read.statusCode).toBe(200);
    expect(await unreadForB()).toBe(0);

    await sendAsA("four");
    await sendAsA("five");
    expect(await unreadForB()).toBe(2);
  });

  it("rejects a non-participant with 403 on reading or posting", async () => {
    const conversation = await app.prisma.conversation.create({
      data: { participants: { create: [{ userId: userAId }, { userId: userBId }] } },
    });

    const read = await app.inject({
      method: "GET",
      url: `/conversations/${conversation.id}/messages`,
      headers: { authorization: `Bearer ${outsiderToken}` },
    });
    expect(read.statusCode).toBe(403);

    const post = await app.inject({
      method: "POST",
      url: `/conversations/${conversation.id}/messages`,
      headers: { authorization: `Bearer ${outsiderToken}` },
      payload: { body: "snooping" },
    });
    expect(post.statusCode).toBe(403);

    const markRead = await app.inject({
      method: "POST",
      url: `/conversations/${conversation.id}/read`,
      headers: { authorization: `Bearer ${outsiderToken}` },
    });
    expect(markRead.statusCode).toBe(403);
  });
});
