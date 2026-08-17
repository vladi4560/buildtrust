import { z } from "zod";
import { contractStatusSchema, milestoneStatusSchema, projectStatusSchema } from "../enums.js";

export const createProjectBodySchema = z.object({
  title: z.string().min(1).max(200),
  sizeLabel: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  budgetPlanned: z.number().int().positive(),
});
export type CreateProjectBody = z.infer<typeof createProjectBodySchema>;

export const projectIdParamsSchema = z.object({ id: z.string() });

export const listProjectsQuerySchema = z.object({
  status: projectStatusSchema.optional(),
});
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;

const contractorSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  avatarUrl: z.string().nullable(),
  rating: z.number(),
});

const nextMilestoneSchema = z.object({
  title: z.string(),
  dueDate: z.coerce.date().nullable(),
});

export const projectSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  sizeLabel: z.string().nullable(),
  description: z.string().nullable(),
  status: projectStatusSchema,
  budgetPlanned: z.number().int(),
  spent: z.number().int(),
  progressPercent: z.number(),
  createdAt: z.coerce.date(),
  contractor: contractorSchema.nullable(),
  nextMilestone: nextMilestoneSchema.nullable(),
});
export type ProjectSummary = z.infer<typeof projectSummarySchema>;

const milestoneSummarySchema = z.object({
  id: z.string(),
  order: z.number().int(),
  title: z.string(),
  amount: z.number().int(),
  status: milestoneStatusSchema,
});

const activeContractSummarySchema = z.object({
  id: z.string(),
  professionalId: z.string(),
  amount: z.number().int(),
  status: contractStatusSchema,
  startDate: z.coerce.date(),
  estimatedEnd: z.coerce.date(),
  workingDays: z.number().int(),
  milestones: z.array(milestoneSummarySchema),
});

export const projectDetailSchema = projectSummarySchema.extend({
  activeContract: activeContractSummarySchema.nullable(),
});
export type ProjectDetail = z.infer<typeof projectDetailSchema>;
