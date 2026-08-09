import type { PrismaClient } from "@prisma/client";
import { ConflictError } from "../../lib/app-error.js";
import type { UpdateMeBody } from "@buildtrust/shared";

export function createUsersService(prisma: PrismaClient) {
  return {
    async updateMe(userId: string, body: UpdateMeBody) {
      if (body.email) {
        const existing = await prisma.user.findUnique({ where: { email: body.email } });
        if (existing && existing.id !== userId) {
          throw new ConflictError("Email is already registered");
        }
      }

      return prisma.user.update({ where: { id: userId }, data: body });
    },
  };
}

export type UsersService = ReturnType<typeof createUsersService>;
