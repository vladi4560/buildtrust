import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  listProfessionalsQuerySchema,
  portfolioItemSchema,
  professionalIdParamsSchema,
  professionalSchema,
} from "@buildtrust/shared";
import { createProfessionalsService } from "./service.js";

export async function professionalRoutes(app: FastifyInstance) {
  const professionalsService = createProfessionalsService(app.prisma);
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.get(
    "/",
    {
      preHandler: [app.authenticate],
      schema: {
        querystring: listProfessionalsQuerySchema,
        response: { 200: z.array(professionalSchema) },
      },
    },
    async (request, reply) => {
      const professionals = await professionalsService.list(request.query.skill);
      reply.status(200).send(professionals);
    },
  );

  server.get(
    "/:id",
    {
      preHandler: [app.authenticate],
      schema: { params: professionalIdParamsSchema, response: { 200: professionalSchema } },
    },
    async (request, reply) => {
      const professional = await professionalsService.getById(request.params.id);
      reply.status(200).send(professional);
    },
  );

  server.get(
    "/:id/portfolio",
    {
      preHandler: [app.authenticate],
      schema: {
        params: professionalIdParamsSchema,
        response: { 200: z.array(portfolioItemSchema) },
      },
    },
    async (request, reply) => {
      const portfolio = await professionalsService.getPortfolio(request.params.id);
      reply.status(200).send(portfolio);
    },
  );
}
