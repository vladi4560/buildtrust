import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { ForbiddenError } from "../../lib/app-error.js";
import {
  createProjectBodySchema,
  listProjectsQuerySchema,
  projectDetailSchema,
  projectIdParamsSchema,
  projectSummarySchema,
} from "@buildtrust/shared";
import { createProjectsService } from "./service.js";

export async function projectRoutes(app: FastifyInstance) {
  const projectsService = createProjectsService(app.prisma);
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.get(
    "/",
    {
      preHandler: [app.authenticate],
      schema: {
        querystring: listProjectsQuerySchema,
        response: { 200: z.array(projectSummarySchema) },
      },
    },
    async (request, reply) => {
      const user = await app.prisma.user.findUniqueOrThrow({ where: { id: request.user.sub } });
      const projects = await projectsService.listForUser(user, request.query);
      reply.status(200).send(projects);
    },
  );

  server.post(
    "/",
    {
      preHandler: [app.authenticate],
      schema: { body: createProjectBodySchema, response: { 201: projectSummarySchema } },
    },
    async (request, reply) => {
      const user = await app.prisma.user.findUniqueOrThrow({ where: { id: request.user.sub } });
      if (user.role !== "CLIENT") {
        throw new ForbiddenError("Only clients can create projects");
      }
      const project = await projectsService.create(user.id, request.body);
      reply.status(201).send({
        ...project,
        spent: 0,
        progressPercent: 0,
        contractor: null,
        nextMilestone: null,
      });
    },
  );

  server.get(
    "/:id",
    {
      preHandler: [app.authenticate],
      schema: { params: projectIdParamsSchema, response: { 200: projectDetailSchema } },
    },
    async (request, reply) => {
      const project = await projectsService.getById(request.params.id, request.user.sub);
      reply.status(200).send(project);
    },
  );
}
