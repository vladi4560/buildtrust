import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { serializeUser } from "../../lib/serialize-user.js";
import {
  authResponseSchema,
  loginBodySchema,
  registerBodySchema,
  setRoleBodySchema,
  userResponseSchema,
} from "./schemas.js";
import { createAuthService } from "./service.js";

export async function authRoutes(app: FastifyInstance) {
  const authService = createAuthService(app.prisma);
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.post(
    "/register",
    { schema: { body: registerBodySchema, response: { 201: authResponseSchema } } },
    async (request, reply) => {
      const user = await authService.register(request.body);
      const token = await reply.jwtSign({ sub: user.id });
      reply.status(201).send({ user: serializeUser(user), token });
    },
  );

  server.post(
    "/login",
    { schema: { body: loginBodySchema, response: { 200: authResponseSchema } } },
    async (request, reply) => {
      const user = await authService.login(request.body);
      const token = await reply.jwtSign({ sub: user.id });
      reply.status(200).send({ user: serializeUser(user), token });
    },
  );

  server.post(
    "/role",
    {
      preHandler: [app.authenticate],
      schema: { body: setRoleBodySchema, response: { 200: userResponseSchema } },
    },
    async (request, reply) => {
      const user = await authService.setRole(request.user.sub, request.body);
      reply.status(200).send(serializeUser(user));
    },
  );

  server.get(
    "/me",
    { preHandler: [app.authenticate], schema: { response: { 200: userResponseSchema } } },
    async (request, reply) => {
      const user = await authService.getById(request.user.sub);
      reply.status(200).send(serializeUser(user));
    },
  );
}
