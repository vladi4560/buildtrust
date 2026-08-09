import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { walletResponseSchema } from "./schemas.js";
import { createWalletService } from "./service.js";

export async function walletRoutes(app: FastifyInstance) {
  const walletService = createWalletService(app.prisma);
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.get(
    "/",
    { preHandler: [app.authenticate], schema: { response: { 200: walletResponseSchema } } },
    async (request, reply) => {
      const user = await app.prisma.user.findUniqueOrThrow({ where: { id: request.user.sub } });
      const wallet = await walletService.getForUser(user);
      reply.status(200).send(wallet);
    },
  );
}
