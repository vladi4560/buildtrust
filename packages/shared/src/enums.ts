import { z } from "zod";

export const userRoleSchema = z.enum(["CLIENT", "PROFESSIONAL"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const projectStatusSchema = z.enum(["PLANNING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

export const contractStatusSchema = z.enum(["DRAFT", "ACTIVE", "COMPLETED", "DISPUTED"]);
export type ContractStatus = z.infer<typeof contractStatusSchema>;

export const milestoneStatusSchema = z.enum([
  "PENDING",
  "IN_PROGRESS",
  "SUBMITTED",
  "APPROVED",
  "RELEASED",
]);
export type MilestoneStatus = z.infer<typeof milestoneStatusSchema>;

export const ledgerEntryTypeSchema = z.enum(["DEPOSIT", "RESERVE", "RELEASE", "REFUND"]);
export type LedgerEntryType = z.infer<typeof ledgerEntryTypeSchema>;

export const reviewDirectionSchema = z.enum(["CLIENT_TO_PRO", "PRO_TO_CLIENT"]);
export type ReviewDirection = z.infer<typeof reviewDirectionSchema>;
