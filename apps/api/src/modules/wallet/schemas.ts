import { z } from "zod";

const transactionTypeSchema = z.enum(["RESERVE", "RELEASE", "REFUND"]);

export const transactionSchema = z.object({
  id: z.string(),
  type: transactionTypeSchema,
  amount: z.number().int(),
  sign: z.enum(["+", "-"]),
  label: z.string(),
  contractId: z.string(),
  projectId: z.string(),
  projectTitle: z.string(),
  milestoneId: z.string().nullable(),
  milestoneTitle: z.string().nullable(),
  createdAt: z.date(),
});

export const walletResponseSchema = z.object({
  balance: z.number().int(),
  transactions: z.array(transactionSchema),
});
