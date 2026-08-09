import { z } from "zod";

// NOTE: these live in apps/api for Phase 1/2. They move into packages/shared
// as the single source of truth in Phase 3 (BUILD_SPEC section 11).

export const registerBodySchema = z.object({
  fullName: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().min(1).max(50),
  password: z.string().min(8).max(200),
});
export type RegisterBody = z.infer<typeof registerBodySchema>;

export const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginBody = z.infer<typeof loginBodySchema>;

export const setRoleBodySchema = z.object({
  role: z.enum(["CLIENT", "PROFESSIONAL"]),
});
export type SetRoleBody = z.infer<typeof setRoleBodySchema>;

export const userResponseSchema = z.object({
  id: z.string(),
  role: z.enum(["CLIENT", "PROFESSIONAL"]).nullable(),
  fullName: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  location: z.string().nullable(),
  bio: z.string().nullable(),
  verified: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const authResponseSchema = z.object({
  user: userResponseSchema,
  token: z.string(),
});
