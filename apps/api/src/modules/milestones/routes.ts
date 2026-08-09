import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { MockPaymentAdapter } from "../../lib/payment-port.js";
import { milestoneIdParamsSchema, milestoneResponseSchema } from "@buildtrust/shared";
import { createMilestonesService } from "./service.js";

export async function milestoneRoutes(app: FastifyInstance) {
  const milestonesService = createMilestonesService(app.prisma, new MockPaymentAdapter());
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.post(
    "/:id/submit",
    {
      preHandler: [app.authenticate],
      schema: { params: milestoneIdParamsSchema, response: { 200: milestoneResponseSchema } },
    },
    async (request, reply) => {
      const milestone = await milestonesService.submit(request.params.id, request.user.sub);
      reply.status(200).send(milestone);
    },
  );

  server.post(
    "/:id/approve",
    {
      preHandler: [app.authenticate],
      schema: { params: milestoneIdParamsSchema, response: { 200: milestoneResponseSchema } },
    },
    async (request, reply) => {
      const milestone = await milestonesService.approve(request.params.id, request.user.sub);
      reply.status(200).send(milestone);
    },
  );
}
