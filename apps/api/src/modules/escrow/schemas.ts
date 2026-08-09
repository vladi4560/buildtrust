import { z } from "zod";
import { contractSchema } from "../contracts/schemas.js";

export const depositBodySchema = z.object({
  contractId: z.string(),
});

export { contractSchema as depositResponseSchema };
