import fp from "fastify-plugin";
import { hasZodFastifySchemaValidationErrors } from "fastify-type-provider-zod";
import type { FastifyError, FastifyPluginAsync } from "fastify";
import { AppError } from "../lib/app-error.js";

export const errorHandlerPlugin: FastifyPluginAsync = fp(async (app) => {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      reply.status(400).send({
        error: "ValidationError",
        message: "Request failed validation",
        issues: error.validation,
      });
      return;
    }

    if (error instanceof AppError) {
      reply.status(error.statusCode).send({
        error: error.name,
        message: error.message,
      });
      return;
    }

    request.log.error(error);
    reply.status(error.statusCode ?? 500).send({
      error: "InternalServerError",
      message: "Something went wrong",
    });
  });
});
