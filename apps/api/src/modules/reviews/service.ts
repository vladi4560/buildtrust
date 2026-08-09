import type { PrismaClient } from "@prisma/client";
import { ConflictError, ForbiddenError, NotFoundError } from "../../lib/app-error.js";
import type { CreateReviewBody } from "./schemas.js";

export function createReviewsService(prisma: PrismaClient) {
  return {
    async listForUser(userId: string) {
      return prisma.review.findMany({
        where: { subjectId: userId },
        include: { author: { select: { id: true, fullName: true, avatarUrl: true } } },
        orderBy: { createdAt: "desc" },
      });
    },

    async getStatsForUser(userId: string) {
      const reviews = await prisma.review.findMany({
        where: { subjectId: userId },
        select: { rating: true },
      });

      const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      let sum = 0;
      for (const { rating } of reviews) {
        if (rating >= 1 && rating <= 5) {
          breakdown[rating as 1 | 2 | 3 | 4 | 5] += 1;
        }
        sum += rating;
      }

      return {
        average: reviews.length === 0 ? 0 : sum / reviews.length,
        count: reviews.length,
        breakdown,
      };
    },

    async create(authorId: string, body: CreateReviewBody) {
      const contract = await prisma.contract.findUnique({ where: { id: body.contractId } });
      if (!contract) {
        throw new NotFoundError("Contract not found");
      }

      let subjectId: string;
      let direction: "CLIENT_TO_PRO" | "PRO_TO_CLIENT";
      if (contract.clientId === authorId) {
        subjectId = contract.professionalId;
        direction = "CLIENT_TO_PRO";
      } else if (contract.professionalId === authorId) {
        subjectId = contract.clientId;
        direction = "PRO_TO_CLIENT";
      } else {
        throw new ForbiddenError("You are not a party to this contract");
      }

      const existing = await prisma.review.findFirst({
        where: { contractId: contract.id, authorId, direction },
      });
      if (existing) {
        throw new ConflictError("You have already reviewed this contract");
      }

      return prisma.review.create({
        data: {
          contractId: contract.id,
          authorId,
          subjectId,
          direction,
          rating: body.rating,
          comment: body.comment ?? null,
        },
        include: { author: { select: { id: true, fullName: true, avatarUrl: true } } },
      });
    },
  };
}

export type ReviewsService = ReturnType<typeof createReviewsService>;
