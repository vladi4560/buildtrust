import { z } from "zod";

export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  icon: z.string().nullable(),
});
export type Category = z.infer<typeof categorySchema>;

export const categoriesResponseSchema = z.array(categorySchema);
