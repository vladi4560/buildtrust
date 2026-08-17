import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { serializeUser } from "../../lib/serialize-user.js";
import { createReviewsService } from "../reviews/service.js";
import {
  updateMeBodySchema,
  userIdParamsSchema,
  userResponseSchema,
  userReviewsQuerySchema,
  userReviewsResponseSchema,
} from "@buildtrust/shared";
import { createUsersService } from "./service.js";

export async function userRoutes(app: FastifyInstance) {
  const usersService = createUsersService(app.prisma);
  const reviewsService = createReviewsService(app.prisma);
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.patch(
    "/me",
    {
      preHandler: [app.authenticate],
      schema: { body: updateMeBodySchema, response: { 200: userResponseSchema } },
    },
    async (request, reply) => {
      const user = await usersService.updateMe(request.user.sub, request.body);
      reply.status(200).send(serializeUser(user));
    },
  );

  server.get(
    "/users/:id/reviews",
    {
      preHandler: [app.authenticate],
      schema: {
        params: userIdParamsSchema,
        querystring: userReviewsQuerySchema,
        response: { 200: userReviewsResponseSchema },
      },
    },
    async (request, reply) => {
      const [stats, page] = await Promise.all([
        reviewsService.getStatsForUser(request.params.id),
        reviewsService.listForUser(request.params.id, request.query),
      ]);
      reply.status(200).send({ ...stats, ...page });
    },
  );
}
