import { z } from "zod";
import { milestoneSchema } from "./contracts.js";

export const milestoneIdParamsSchema = z.object({ id: z.string() });

export const milestoneResponseSchema = milestoneSchema;
