// FILE: src/lib/broadcasts/utils.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Broadcast parsing and rate-limit timing are isolated so campaign
 * APIs and tests can verify safety without hitting Meta.
 */
import { z } from "zod";

export const BROADCAST_DELAY_MS = 1200;

export const broadcastCreateSchema = z.object({
  connectionId: z.string().uuid().optional(),
  templateId: z.string().uuid(),
  name: z.string().min(2).max(120),
  parameters: z.array(z.string().max(120)).default([]),
  recipients: z
    .array(
      z.object({
        phone: z.string().min(7).max(20),
        name: z.string().max(120).optional().or(z.literal("")),
      }),
    )
    .min(1)
    .max(250),
});

export function parseRecipientLines(value: string): Array<{ phone: string; name?: string }> {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [phone = "", ...nameParts] = line.split(",");
      return {
        phone: normalizePhoneForSend(phone),
        name: nameParts.join(",").trim() || undefined,
      };
    })
    .filter((recipient) => recipient.phone.length >= 7);
}

export function normalizePhoneForSend(value: string): string {
  return value.replace(/[^\d+]/g, "").replace(/^\+/, "");
}

export function delay(ms = BROADCAST_DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
