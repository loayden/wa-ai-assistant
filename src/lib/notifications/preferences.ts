import type { Prisma } from "@prisma/client";

export type NotificationEvent = "angry" | "lead" | "handoff" | "daily_summary" | "weekly_report" | "ai_failed";

export type NotificationPrefs = Record<NotificationEvent, boolean>;

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  angry: true,
  lead: true,
  handoff: true,
  daily_summary: false,
  weekly_report: true,
  ai_failed: true,
};

export function normalizeNotificationPrefs(value: Prisma.JsonValue | NotificationPrefs | null | undefined): NotificationPrefs {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_NOTIFICATION_PREFS;
  }

  const raw = value as Partial<Record<NotificationEvent, unknown>>;

  return {
    angry: typeof raw.angry === "boolean" ? raw.angry : DEFAULT_NOTIFICATION_PREFS.angry,
    lead: typeof raw.lead === "boolean" ? raw.lead : DEFAULT_NOTIFICATION_PREFS.lead,
    handoff: typeof raw.handoff === "boolean" ? raw.handoff : DEFAULT_NOTIFICATION_PREFS.handoff,
    daily_summary: typeof raw.daily_summary === "boolean" ? raw.daily_summary : DEFAULT_NOTIFICATION_PREFS.daily_summary,
    weekly_report: typeof raw.weekly_report === "boolean" ? raw.weekly_report : DEFAULT_NOTIFICATION_PREFS.weekly_report,
    ai_failed: typeof raw.ai_failed === "boolean" ? raw.ai_failed : DEFAULT_NOTIFICATION_PREFS.ai_failed,
  };
}

export function shouldSendNotification(value: Prisma.JsonValue | NotificationPrefs | null | undefined, event: NotificationEvent) {
  return normalizeNotificationPrefs(value)[event];
}
