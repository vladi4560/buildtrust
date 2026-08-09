import { z } from "zod";
import { userResponseSchema } from "../auth/schemas.js";
import { userReviewsResponseSchema } from "../reviews/schemas.js";

export const updateMeBodySchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  phone: z.string().min(1).max(50).optional(),
  email: z.string().email().optional(),
  location: z.string().max(200).optional(),
  bio: z.string().max(2000).optional(),
  avatarUrl: z.string().url().optional(),
});
export type UpdateMeBody = z.infer<typeof updateMeBodySchema>;

export const userIdParamsSchema = z.object({ id: z.string() });

export { userResponseSchema, userReviewsResponseSchema };
