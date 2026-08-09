import Fastify, { type FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { errorHandlerPlugin } from "./plugins/error-handler.js";
import { jwtPlugin } from "./plugins/jwt.js";
import { prismaPlugin } from "./plugins/prisma.js";
import { authRoutes } from "./modules/auth/routes.js";
import { contractRoutes } from "./modules/contracts/routes.js";
import { escrowRoutes } from "./modules/escrow/routes.js";
import { milestoneRoutes } from "./modules/milestones/routes.js";
import { professionalRoutes } from "./modules/professionals/routes.js";
import { projectRoutes } from "./modules/projects/routes.js";
import { reviewRoutes } from "./modules/reviews/routes.js";
import { userRoutes } from "./modules/users/routes.js";
import { walletRoutes } from "./modules/wallet/routes.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(errorHandlerPlugin);
  await app.register(prismaPlugin);
  await app.register(jwtPlugin);

  app.get("/health", async () => {
    return { status: "ok" as const };
  });

  await app.register(authRoutes, { prefix: "/auth" });
  await app.register(userRoutes);
  await app.register(professionalRoutes, { prefix: "/professionals" });
  await app.register(reviewRoutes, { prefix: "/reviews" });
  await app.register(projectRoutes, { prefix: "/projects" });
  await app.register(contractRoutes, { prefix: "/contracts" });
  await app.register(milestoneRoutes, { prefix: "/milestones" });
  await app.register(escrowRoutes, { prefix: "/escrow" });
  await app.register(walletRoutes, { prefix: "/wallet" });

  return app;
}
