import type { PrismaClient } from "@prisma/client";

export function createCategoriesService(prisma: PrismaClient) {
  return {
    async list() {
      return prisma.category.findMany({ orderBy: { name: "asc" } });
    },
  };
}

export type CategoriesService = ReturnType<typeof createCategoriesService>;
