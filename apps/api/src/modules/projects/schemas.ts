import { z } from "zod";

export const createProjectBodySchema = z.object({
  title: z.string().min(1).max(200),
  sizeLabel: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  budgetPlanned: z.number().int().positive(),
});
export type CreateProjectBody = z.infer<typeof createProjectBodySchema>;

export const projectIdParamsSchema = z.object({ id: z.string() });

const projectStatusSchema = z.enum(["PLANNING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);
const milestoneStatusSchema = z.enum([
  "PENDING",
  "IN_PROGRESS",
  "SUBMITTED",
  "APPROVED",
  "RELEASED",
]);
const contractStatusSchema = z.enum(["DRAFT", "ACTIVE", "COMPLETED", "DISPUTED"]);

export const projectSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  sizeLabel: z.string().nullable(),
  description: z.string().nullable(),
  status: projectStatusSchema,
  budgetPlanned: z.number().int(),
  spent: z.number().int(),
  progressPercent: z.number(),
  createdAt: z.date(),
});

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
  startDate: z.date(),
  estimatedEnd: z.date(),
  workingDays: z.number().int(),
  milestones: z.array(milestoneSummarySchema),
});

export const projectDetailSchema = projectSummarySchema.extend({
  activeContract: activeContractSummarySchema.nullable(),
});
