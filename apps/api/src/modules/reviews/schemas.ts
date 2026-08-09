import { z } from "zod";

export const createReviewBodySchema = z.object({
  contractId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});
export type CreateReviewBody = z.infer<typeof createReviewBodySchema>;

export const reviewSchema = z.object({
  id: z.string(),
  contractId: z.string(),
  authorId: z.string(),
  author: z.object({ id: z.string(), fullName: z.string(), avatarUrl: z.string().nullable() }),
  subjectId: z.string(),
  direction: z.enum(["CLIENT_TO_PRO", "PRO_TO_CLIENT"]),
  rating: z.number().int(),
  comment: z.string().nullable(),
  createdAt: z.date(),
});

export const reviewBreakdownSchema = z.object({
  5: z.number().int(),
  4: z.number().int(),
  3: z.number().int(),
  2: z.number().int(),
  1: z.number().int(),
});

export const userReviewsResponseSchema = z.object({
  average: z.number(),
  count: z.number().int(),
  breakdown: reviewBreakdownSchema,
  reviews: z.array(reviewSchema),
});
