import { z } from "zod";
import { userRoleSchema } from "../enums.js";

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
  role: userRoleSchema,
});
export type SetRoleBody = z.infer<typeof setRoleBodySchema>;

export const userResponseSchema = z.object({
  id: z.string(),
  role: userRoleSchema.nullable(),
  fullName: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  location: z.string().nullable(),
  bio: z.string().nullable(),
  verified: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type UserResponse = z.infer<typeof userResponseSchema>;

export const authResponseSchema = z.object({
  user: userResponseSchema,
  token: z.string(),
});
export type AuthResponse = z.infer<typeof authResponseSchema>;
