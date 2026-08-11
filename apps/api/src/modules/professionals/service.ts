import type { Prisma, PrismaClient, ProfessionalProfile, User } from "@prisma/client";
import type { ListProfessionalsQuery } from "@buildtrust/shared";
import { NotFoundError } from "../../lib/app-error.js";
import { createReviewsService } from "../reviews/service.js";

const professionalProfileInclude = {
  professionalProfile: {
    include: { categories: { include: { category: true } } },
  },
} satisfies Prisma.UserInclude;

type UserWithProfile = User & {
  professionalProfile:
    | (ProfessionalProfile & {
        categories: { category: { id: string; name: string; slug: string; icon: string | null } }[];
      })
    | null;
};

export function createProfessionalsService(prisma: PrismaClient) {
  const reviewsService = createReviewsService(prisma);

  async function toProfessionalDto(user: UserWithProfile) {
    if (!user.professionalProfile) {
      throw new NotFoundError("Professional not found");
    }
    const stats = await reviewsService.getStatsForUser(user.id);

    return {
      id: user.id,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      location: user.location,
      bio: user.bio,
      verified: user.verified,
      specialty: user.professionalProfile.specialty,
      yearsExperience: user.professionalProfile.yearsExperience,
      skills: user.professionalProfile.skills,
      onTimePercent: user.professionalProfile.onTimePercent,
      projectsCount: user.professionalProfile.projectsCount,
      rating: stats.average,
      reviewCount: stats.count,
      dailyRate: user.professionalProfile.dailyRate,
      available: user.professionalProfile.available,
      categories: user.professionalProfile.categories.map((link) => link.category),
    };
  }

  return {
    async list(params?: ListProfessionalsQuery) {
      const profileWhere: Prisma.ProfessionalProfileWhereInput = {};
      if (params?.skill) {
        profileWhere.skills = { has: params.skill };
      }
      if (params?.category) {
        profileWhere.categories = { some: { category: { slug: params.category } } };
      }

      const where: Prisma.UserWhereInput = {
        role: "PROFESSIONAL",
        professionalProfile: { isNot: null, is: profileWhere },
      };

      if (params?.search) {
        where.OR = [
          { fullName: { contains: params.search, mode: "insensitive" } },
          {
            professionalProfile: {
              is: { specialty: { contains: params.search, mode: "insensitive" } },
            },
          },
        ];
      }

      const users = await prisma.user.findMany({
        where,
        include: professionalProfileInclude,
        orderBy: { fullName: "asc" },
      });

      const dtos = await Promise.all(users.map(toProfessionalDto));

      if (params?.sort === "rating") {
        dtos.sort((a, b) => b.rating - a.rating);
      } else if (params?.sort === "price") {
        dtos.sort((a, b) => a.dailyRate - b.dailyRate);
      }
      // sort === "distance": no geolocation data yet, keep the stable default order.

      return dtos;
    },

    async getById(id: string) {
      const user = await prisma.user.findUnique({
        where: { id },
        include: professionalProfileInclude,
      });
      if (!user) {
        throw new NotFoundError("Professional not found");
      }
      return toProfessionalDto(user);
    },

    async getPortfolio(id: string) {
      return prisma.portfolioItem.findMany({
        where: { professionalId: id },
        orderBy: { createdAt: "asc" },
      });
    },
  };
}

export type ProfessionalsService = ReturnType<typeof createProfessionalsService>;
