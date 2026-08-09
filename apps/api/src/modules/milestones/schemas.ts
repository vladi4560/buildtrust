import { z } from "zod";

export const milestoneIdParamsSchema = z.object({ id: z.string() });

const milestoneStatusSchema = z.enum([
  "PENDING",
  "IN_PROGRESS",
  "SUBMITTED",
  "APPROVED",
  "RELEASED",
]);

export const milestoneResponseSchema = z.object({
  id: z.string(),
  contractId: z.string(),
  order: z.number().int(),
  title: z.string(),
  amount: z.number().int(),
  status: milestoneStatusSchema,
  approvedAt: z.date().nullable(),
  releasedAt: z.date().nullable(),
});
