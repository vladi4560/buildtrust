import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  conversationDetailSchema,
  conversationIdParamsSchema,
  conversationsResponseSchema,
  createConversationBodySchema,
  messageSchema,
  messagesPageSchema,
  messagesQuerySchema,
  sendMessageBodySchema,
} from "@buildtrust/shared";
import { createConversationsService } from "./service.js";

const okResponseSchema = z.object({ ok: z.literal(true) });

export async function conversationRoutes(app: FastifyInstance) {
  const conversationsService = createConversationsService(app.prisma);
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.get(
    "/conversations",
    { preHandler: [app.authenticate], schema: { response: { 200: conversationsResponseSchema } } },
    async (request, reply) => {
      const conversations = await conversationsService.list(request.user.sub);
      reply.status(200).send(conversations);
    },
  );

  server.post(
    "/conversations",
    {
      preHandler: [app.authenticate],
      schema: { body: createConversationBodySchema, response: { 200: conversationDetailSchema } },
    },
    async (request, reply) => {
      const conversation = await conversationsService.getOrCreate(request.user.sub, request.body);
      reply.status(200).send(conversation);
    },
  );

  server.get(
    "/conversations/:id/messages",
    {
      preHandler: [app.authenticate],
      schema: {
        params: conversationIdParamsSchema,
        querystring: messagesQuerySchema,
        response: { 200: messagesPageSchema },
      },
    },
    async (request, reply) => {
      const page = await conversationsService.listMessages(
        request.params.id,
        request.user.sub,
        request.query,
      );
      reply.status(200).send(page);
    },
  );

  server.post(
    "/conversations/:id/messages",
    {
      preHandler: [app.authenticate],
      schema: {
        params: conversationIdParamsSchema,
        body: sendMessageBodySchema,
        response: { 201: messageSchema },
      },
    },
    async (request, reply) => {
      const message = await conversationsService.sendMessage(
        request.params.id,
        request.user.sub,
        request.body,
      );
      reply.status(201).send(message);
    },
  );

  server.post(
    "/conversations/:id/read",
    {
      preHandler: [app.authenticate],
      schema: { params: conversationIdParamsSchema, response: { 200: okResponseSchema } },
    },
    async (request, reply) => {
      await conversationsService.markRead(request.params.id, request.user.sub);
      reply.status(200).send({ ok: true });
    },
  );
}
