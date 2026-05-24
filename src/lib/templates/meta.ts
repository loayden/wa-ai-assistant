// FILE: src/lib/templates/meta.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Template shaping is pure and testable so API routes can validate
 * WhatsApp payloads before making Meta calls.
 */
import { z } from "zod";

export const TEMPLATE_CATEGORIES = ["MARKETING", "UTILITY", "AUTHENTICATION"] as const;
export const TEMPLATE_LANGUAGES = ["ar", "en"] as const;
export const TEMPLATE_STATUSES = ["draft", "pending", "approved", "rejected"] as const;

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];
export type TemplateLanguage = (typeof TEMPLATE_LANGUAGES)[number];
export type TemplateStatus = (typeof TEMPLATE_STATUSES)[number];

export type TemplateComponent =
  | { type: "HEADER"; format: "TEXT"; text: string }
  | { type: "BODY"; text: string }
  | { type: "FOOTER"; text: string }
  | { type: "BUTTONS"; buttons: Array<{ type: "URL"; text: string; url: string }> };

export const templateMutationSchema = z.object({
  connectionId: z.string().uuid().optional(),
  name: z
    .string()
    .min(2)
    .max(80)
    .transform((value) => normalizeTemplateName(value))
    .refine((value) => /^[a-z0-9_]+$/.test(value), "Use lowercase letters, numbers, and underscores only."),
  displayName: z.string().min(2).max(120),
  category: z.enum(TEMPLATE_CATEGORIES),
  language: z.enum(TEMPLATE_LANGUAGES).default("ar"),
  headerText: z.string().max(60).optional().or(z.literal("")),
  bodyText: z.string().min(8).max(1024),
  footerText: z.string().max(60).optional().or(z.literal("")),
  buttonText: z.string().max(25).optional().or(z.literal("")),
  buttonUrl: z.string().url().optional().or(z.literal("")),
});

export const templateSendSchema = z.object({
  to: z.string().min(7).max(20),
  parameters: z.array(z.string().max(120)).default([]),
});

export function normalizeTemplateName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function languageCodeForTemplate(language: TemplateLanguage): string {
  return language === "ar" ? "ar" : "en_US";
}

export function buildMetaTemplateComponents(input: {
  headerText?: string | null;
  bodyText: string;
  footerText?: string | null;
  buttonText?: string | null;
  buttonUrl?: string | null;
}): TemplateComponent[] {
  const components: TemplateComponent[] = [];

  if (input.headerText?.trim()) {
    components.push({ type: "HEADER", format: "TEXT", text: input.headerText.trim() });
  }

  components.push({ type: "BODY", text: input.bodyText.trim() });

  if (input.footerText?.trim()) {
    components.push({ type: "FOOTER", text: input.footerText.trim() });
  }

  if (input.buttonText?.trim() && input.buttonUrl?.trim()) {
    components.push({
      type: "BUTTONS",
      buttons: [{ type: "URL", text: input.buttonText.trim(), url: input.buttonUrl.trim() }],
    });
  }

  return components;
}

export function extractTemplateVariables(bodyText: string): number[] {
  const matches = bodyText.matchAll(/\{\{\s*(\d+)\s*\}\}/g);
  return Array.from(new Set(Array.from(matches, (match) => Number(match[1])))).sort((a, b) => a - b);
}

export function maskTemplateVariables(bodyText: string): string {
  return bodyText.replace(/\{\{\s*(\d+)\s*\}\}/g, "[متغير $1]");
}

export function normalizeMetaTemplateStatus(value: unknown): TemplateStatus {
  const status = String(value ?? "pending").toLowerCase();

  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  if (status === "draft") return "draft";
  return "pending";
}
