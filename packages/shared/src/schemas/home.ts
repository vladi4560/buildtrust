import { z } from "zod";

export const milestoneApprovalItemSchema = z.object({
  kind: z.literal("milestone_approval"),
  contractId: z.string(),
  milestoneId: z.string(),
  projectId: z.string(),
  projectTitle: z.string(),
  milestoneTitle: z.string(),
  amount: z.number().int(),
});
export type MilestoneApprovalItem = z.infer<typeof milestoneApprovalItemSchema>;

export const depositDueItemSchema = z.object({
  kind: z.literal("deposit_due"),
  contractId: z.string(),
  projectId: z.string(),
  projectTitle: z.string(),
  amountDue: z.number().int(),
});
export type DepositDueItem = z.infer<typeof depositDueItemSchema>;

export const actionItemSchema = z.discriminatedUnion("kind", [
  milestoneApprovalItemSchema,
  depositDueItemSchema,
]);
export type ActionItem = z.infer<typeof actionItemSchema>;

export const actionItemsResponseSchema = z.array(actionItemSchema);

export const homeSummarySchema = z.object({
  released: z.number().int(),
  inEscrow: z.number().int(),
  remaining: z.number().int(),
  committed: z.number().int(),
});
export type HomeSummary = z.infer<typeof homeSummarySchema>;
