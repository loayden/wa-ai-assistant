// FILE: src/lib/validators/whatsapp.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: WhatsApp connection data is validated before encryption/storage,
 * and webhook verification query keys preserve Meta's `hub.*` parameter names.
 */
import { z } from "zod";

const metaNumericIdSchema = z
  .string({ required_error: "هذا الحقل مطلوب." })
  .trim()
  .regex(/^\d+$/, "يجب أن يحتوي على أرقام فقط.")
  .min(5, "يجب أن يكون 5 أرقام على الأقل.")
  .max(32, "يجب ألا يتجاوز 32 رقماً.");

export const connectWhatsAppSchema = z
  .object({
    phoneNumberId: metaNumericIdSchema,
    businessAccountId: metaNumericIdSchema,
    accessToken: z
      .string({ required_error: "رمز الوصول مطلوب." })
      .trim()
      .min(20, "رمز الوصول قصير جداً. انسخ الرمز كاملاً من Meta.")
      .max(4096, "رمز الوصول طويل جداً."),
    displayName: z.string().trim().max(100, "الاسم طويل جداً. الحد الأقصى 100 حرف.").nullable().optional(),
    ownerPhoneNumber: z.string().trim().min(6, "رقم الهاتف قصير جداً.").max(32, "رقم الهاتف طويل جداً.").optional(),
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
