import { z } from "zod";

export const listProfessionalsQuerySchema = z.object({
  skill: z.string().optional(),
});
export type ListProfessionalsQuery = z.infer<typeof listProfessionalsQuerySchema>;

export const professionalIdParamsSchema = z.object({ id: z.string() });

export const professionalSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  avatarUrl: z.string().nullable(),
  location: z.string().nullable(),
  bio: z.string().nullable(),
  verified: z.boolean(),
  specialty: z.string(),
  yearsExperience: z.number().int(),
  skills: z.array(z.string()),
  onTimePercent: z.number().int(),
  projectsCount: z.number().int(),
  rating: z.number(),
  reviewCount: z.number().int(),
});
export type Professional = z.infer<typeof professionalSchema>;

export const portfolioItemSchema = z.object({
  id: z.string(),
  imageUrl: z.string(),
  caption: z.string().nullable(),
  createdAt: z.coerce.date(),
});
export type PortfolioItem = z.infer<typeof portfolioItemSchema>;
