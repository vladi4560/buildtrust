import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { actionItemsResponseSchema, homeSummarySchema } from "@buildtrust/shared";
import { createHomeService } from "./service.js";

export async function homeRoutes(app: FastifyInstance) {
  const homeService = createHomeService(app.prisma);
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.get(
    "/home/summary",
    { preHandler: [app.authenticate], schema: { response: { 200: homeSummarySchema } } },
    async (request, reply) => {
      const summary = await homeService.getSummary(request.user.sub);
      reply.status(200).send(summary);
    },
  );

  server.get(
    "/me/action-items",
    { preHandler: [app.authenticate], schema: { response: { 200: actionItemsResponseSchema } } },
    async (request, reply) => {
      const items = await homeService.getActionItems(request.user.sub);
      reply.status(200).send(items);
    },
  );
}
