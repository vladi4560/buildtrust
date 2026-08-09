import { z } from "zod";

export const createContractBodySchema = z
  .object({
    projectId: z.string(),
    professionalId: z.string(),
    amount: z.number().int().positive(),
    startDate: z.coerce.date(),
    estimatedEnd: z.coerce.date(),
    workingDays: z.number().int().positive(),
    scope: z.string().min(1).max(2000),
    milestones: z
      .array(z.object({ title: z.string().min(1).max(200), amount: z.number().int().positive() }))
      .min(1),
  })
  .refine((body) => body.milestones.reduce((sum, m) => sum + m.amount, 0) === body.amount, {
    message: "Milestone amounts must sum to the contract amount",
    path: ["milestones"],
  });
export type CreateContractBody = z.infer<typeof createContractBodySchema>;

export const contractIdParamsSchema = z.object({ id: z.string() });

const milestoneStatusSchema = z.enum([
  "PENDING",
  "IN_PROGRESS",
  "SUBMITTED",
  "APPROVED",
  "RELEASED",
]);
const contractStatusSchema = z.enum(["DRAFT", "ACTIVE", "COMPLETED", "DISPUTED"]);

export const milestoneSchema = z.object({
  id: z.string(),
  contractId: z.string(),
  order: z.number().int(),
  title: z.string(),
  amount: z.number().int(),
  status: milestoneStatusSchema,
  approvedAt: z.date().nullable(),
  releasedAt: z.date().nullable(),
});

export const contractSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  clientId: z.string(),
  professionalId: z.string(),
  amount: z.number().int(),
  startDate: z.date(),
  estimatedEnd: z.date(),
  workingDays: z.number().int(),
  scope: z.string(),
  status: contractStatusSchema,
  version: z.number().int(),
  milestones: z.array(milestoneSchema),
});
