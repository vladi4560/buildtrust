import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { createReviewBodySchema, reviewSchema } from "./schemas.js";
import { createReviewsService } from "./service.js";

export async function reviewRoutes(app: FastifyInstance) {
  const reviewsService = createReviewsService(app.prisma);
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.post(
    "/",
    {
      preHandler: [app.authenticate],
      schema: { body: createReviewBodySchema, response: { 201: reviewSchema } },
    },
    async (request, reply) => {
      const review = await reviewsService.create(request.user.sub, request.body);
      reply.status(201).send(review);
    },
  );
}
