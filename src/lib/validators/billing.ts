// FILE: src/lib/validators/billing.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Billing plan selection is validated explicitly so checkout routes
 * only accept supported paid plans from trusted server-side code paths.
 */
import { z } from "zod";

export const createCheckoutSchema = z
  .object({
    planTier: z.enum(["PRO", "BUSINESS"]),
  })
  .strict();

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
