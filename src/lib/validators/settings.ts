// FILE: src/lib/validators/settings.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Settings updates are partial but bounded, which lets the dashboard
 * save individual controls without accepting oversized prompts or invalid
 * reply-length limits.
 */
import { z } from "zod";

import { WORKING_DAY_KEYS } from "@/lib/assistant/working-hours";
import { DEFAULT_NOTIFICATION_PREFS } from "@/lib/notifications/preferences";

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

export const timeStringSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Use HH:mm time.");

export const notificationPrefsSchema = z
  .object({
    angry: z.boolean().default(DEFAULT_NOTIFICATION_PREFS.angry),
    lead: z.boolean().default(DEFAULT_NOTIFICATION_PREFS.lead),
    handoff: z.boolean().default(DEFAULT_NOTIFICATION_PREFS.handoff),
    daily_summary: z.boolean().default(DEFAULT_NOTIFICATION_PREFS.daily_summary),
    weekly_report: z.boolean().default(DEFAULT_NOTIFICATION_PREFS.weekly_report),
    ai_failed: z.boolean().default(DEFAULT_NOTIFICATION_PREFS.ai_failed),
  })
  .partial()
  .strict();

export const updateSettingsSchema = z
  .object({
    systemPrompt: z.string().trim().max(2000).optional(),
    autoReplyEnabled: z.boolean().optional(),
    language: languageSchema.optional(),
    businessName: optionalTrimmedString(120),
    businessContext: optionalTrimmedString(4000),
    fallbackMessage: optionalTrimmedString(500),
    maxReplyLength: z.number().int().min(50).max(1000).optional(),
    workingHoursEnabled: z.boolean().optional(),
    workingHoursStart: timeStringSchema.optional(),
    workingHoursEnd: timeStringSchema.optional(),
    workingDays: z.array(z.enum(WORKING_DAY_KEYS)).min(1).optional(),
    offHoursMessage: z.string().trim().min(1).max(200).optional(),
    timezone: z
      .enum(["Africa/Cairo", "Asia/Riyadh", "Asia/Dubai", "Asia/Kuwait", "Africa/Tripoli"])
      .optional(),
    csatEnabled: z.boolean().optional(),
    notificationPrefs: notificationPrefsSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one setting must be provided.",
  });

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
