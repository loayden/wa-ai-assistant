// FILE: src/lib/validators/whatsapp.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: WhatsApp connection data is validated before encryption/storage,
 * and webhook verification query keys preserve Meta's `hub.*` parameter names.
 */
import { z } from "zod";

const metaNumericIdSchema = z.string().trim().regex(/^\d+$/).min(5).max(32);

export const connectWhatsAppSchema = z
  .object({
    phoneNumberId: metaNumericIdSchema,
    businessAccountId: metaNumericIdSchema,
    accessToken: z.string().trim().min(20).max(4096),
    displayName: z.string().trim().max(100).nullable().optional(),
    ownerPhoneNumber: z.string().trim().min(6).max(32).optional(),
  })
  .strict();

export const embeddedSignupExchangeSchema = z
  .object({
    code: z.string().trim().min(10).max(4096),
    phoneNumberId: metaNumericIdSchema,
    businessAccountId: metaNumericIdSchema,
    event: z.enum(["FINISH", "FINISH_ONLY_WABA", "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING"]).optional(),
  })
  .strict();

export const webhookVerifySchema = z
  .object({
    "hub.mode": z.literal("subscribe"),
    "hub.verify_token": z.string().min(1).max(255),
    "hub.challenge": z.string().min(1).max(2048),
  })
  .passthrough();

export type ConnectWhatsAppInput = z.infer<typeof connectWhatsAppSchema>;
export type EmbeddedSignupExchangeInput = z.infer<typeof embeddedSignupExchangeSchema>;
export type WebhookVerifyInput = z.infer<typeof webhookVerifySchema>;
