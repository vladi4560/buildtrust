import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { ForbiddenError } from "../../lib/app-error.js";
import {
  contractIdParamsSchema,
  contractSchema,
  createContractBodySchema,
} from "@buildtrust/shared";
import { createContractsService } from "./service.js";

export async function contractRoutes(app: FastifyInstance) {
  const contractsService = createContractsService(app.prisma);
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.post(
    "/",
    {
      preHandler: [app.authenticate],
      schema: { body: createContractBodySchema, response: { 201: contractSchema } },
    },
    async (request, reply) => {
      const user = await app.prisma.user.findUniqueOrThrow({ where: { id: request.user.sub } });
      if (user.role !== "CLIENT") {
        throw new ForbiddenError("Only clients can create contracts");
      }
      const contract = await contractsService.create(user.id, request.body);
      reply.status(201).send(contract);
    },
  );

  server.get(
    "/:id",
    {
      preHandler: [app.authenticate],
      schema: { params: contractIdParamsSchema, response: { 200: contractSchema } },
    },
    async (request, reply) => {
      const contract = await contractsService.getById(request.params.id, request.user.sub);
      reply.status(200).send(contract);
    },
  );
}
