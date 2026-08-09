import type { PrismaClient, ProfessionalProfile, User } from "@prisma/client";
import { NotFoundError } from "../../lib/app-error.js";
import { createReviewsService } from "../reviews/service.js";

type UserWithProfile = User & { professionalProfile: ProfessionalProfile | null };

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
    };
  }

  return {
    async list(skill?: string) {
      const users = await prisma.user.findMany({
        where: {
          role: "PROFESSIONAL",
          professionalProfile: skill ? { skills: { has: skill } } : { isNot: null },
        },
        include: { professionalProfile: true },
      });

      return Promise.all(users.map(toProfessionalDto));
    },

    async getById(id: string) {
      const user = await prisma.user.findUnique({
        where: { id },
        include: { professionalProfile: true },
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
