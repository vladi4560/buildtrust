import { z } from "zod";
import { contractSchema } from "./contracts.js";

export const depositBodySchema = z.object({
  contractId: z.string(),
});
export type DepositBody = z.infer<typeof depositBodySchema>;

export const depositResponseSchema = contractSchema;
