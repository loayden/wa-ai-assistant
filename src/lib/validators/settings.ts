// FILE: src/lib/validators/settings.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Settings updates are partial but bounded, which lets the dashboard
 * save individual controls without accepting oversized prompts or invalid
 * reply-length limits.
 */
import { z } from "zod";

function optionalTrimmedString(maxLength: number) {
  return z
    .string()
    .trim()
    .max(maxLength)
    .nullable()
    .optional();
}

export const languageSchema = z
  .string()
  .trim()
  .min(2)
  .max(10)
  .regex(/^[a-z]{2,3}(-[A-Z]{2})?$/, "Language must use a short locale code such as en or en-US.");

export const updateSettingsSchema = z
  .object({
    systemPrompt: z.string().trim().max(2000).optional(),
    autoReplyEnabled: z.boolean().optional(),
    language: languageSchema.optional(),
    businessName: optionalTrimmedString(120),
    businessContext: optionalTrimmedString(4000),
    fallbackMessage: optionalTrimmedString(500),
    maxReplyLength: z.number().int().min(50).max(1000).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one setting must be provided.",
  });

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
