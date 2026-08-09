import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { MockPaymentAdapter } from "../../lib/payment-port.js";
import { depositBodySchema, depositResponseSchema } from "./schemas.js";
import { createEscrowService } from "./service.js";

export async function escrowRoutes(app: FastifyInstance) {
  const escrowService = createEscrowService(app.prisma, new MockPaymentAdapter());
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.post(
    "/deposit",
    {
      preHandler: [app.authenticate],
      schema: { body: depositBodySchema, response: { 200: depositResponseSchema } },
    },
    async (request, reply) => {
      const contract = await escrowService.deposit(request.body.contractId, request.user.sub);
      reply.status(200).send(contract);
    },
  );
}
