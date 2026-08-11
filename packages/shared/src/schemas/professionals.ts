import { z } from "zod";
import { categorySchema } from "./categories.js";

export const professionalSortSchema = z.enum(["rating", "price", "distance"]);
export type ProfessionalSort = z.infer<typeof professionalSortSchema>;

export const listProfessionalsQuerySchema = z.object({
  skill: z.string().optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  sort: professionalSortSchema.optional(),
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
  dailyRate: z.number().int(),
  available: z.boolean(),
  categories: z.array(categorySchema),
});
export type Professional = z.infer<typeof professionalSchema>;

export const portfolioItemSchema = z.object({
  id: z.string(),
  imageUrl: z.string(),
  caption: z.string().nullable(),
  createdAt: z.coerce.date(),
});
export type PortfolioItem = z.infer<typeof portfolioItemSchema>;
