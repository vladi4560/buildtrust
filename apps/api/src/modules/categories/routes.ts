import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { categoriesResponseSchema } from "@buildtrust/shared";
import { createCategoriesService } from "./service.js";

export async function categoryRoutes(app: FastifyInstance) {
  const categoriesService = createCategoriesService(app.prisma);
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.get(
    "/",
    { preHandler: [app.authenticate], schema: { response: { 200: categoriesResponseSchema } } },
    async (_request, reply) => {
      const categories = await categoriesService.list();
      reply.status(200).send(categories);
    },
  );
}
