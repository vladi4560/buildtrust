import { z } from "zod";
import { ledgerEntryTypeSchema } from "../enums.js";

const transactionTypeSchema = ledgerEntryTypeSchema.exclude(["DEPOSIT"]);

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
  createdAt: z.coerce.date(),
});
export type Transaction = z.infer<typeof transactionSchema>;

export const walletResponseSchema = z.object({
  balance: z.number().int(),
  transactions: z.array(transactionSchema),
});
export type WalletResponse = z.infer<typeof walletResponseSchema>;
