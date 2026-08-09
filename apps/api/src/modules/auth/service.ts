import bcrypt from "bcrypt";
import type { PrismaClient } from "@prisma/client";
import { ConflictError, UnauthorizedError } from "../../lib/app-error.js";
import type { LoginBody, RegisterBody, SetRoleBody } from "@buildtrust/shared";

const BCRYPT_ROUNDS = 12;

export function createAuthService(prisma: PrismaClient) {
  return {
    async register(body: RegisterBody) {
      const existing = await prisma.user.findUnique({ where: { email: body.email } });
      if (existing) {
        throw new ConflictError("Email is already registered");
      }

      const passwordHash = await bcrypt.hash(body.password, BCRYPT_ROUNDS);
      const user = await prisma.user.create({
        data: {
          fullName: body.fullName,
          email: body.email,
          phone: body.phone,
          passwordHash,
        },
      });

      return user;
    },

    async login(body: LoginBody) {
      const user = await prisma.user.findUnique({ where: { email: body.email } });
      if (!user) {
        throw new UnauthorizedError("Invalid email or password");
      }

      const passwordMatches = await bcrypt.compare(body.password, user.passwordHash);
      if (!passwordMatches) {
        throw new UnauthorizedError("Invalid email or password");
      }

      return user;
    },

    async setRole(userId: string, body: SetRoleBody) {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { role: body.role },
      });

      return user;
    },

    async getById(userId: string) {
      const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
      return user;
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
