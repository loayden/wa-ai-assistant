// FILE: src/lib/api/settings.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Settings are lazily created so every tenant has a usable default
 * prompt before onboarding forms or webhook processing complete.
 */
import "server-only";

import type { Prisma, UserSettings } from "@prisma/client";

import { prisma } from "@/lib/prisma/client";
import { DEFAULT_NOTIFICATION_PREFS } from "@/lib/notifications/preferences";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/utils/constants";

const persistedUserSettingsSelect = {
  id: true,
  userId: true,
  systemPrompt: true,
  autoReplyEnabled: true,
  language: true,
  businessName: true,
  businessContext: true,
  fallbackMessage: true,
  maxReplyLength: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSettingsSelect;

type PersistedUserSettings = Prisma.UserSettingsGetPayload<{ select: typeof persistedUserSettingsSelect }>;

function withRuntimeSettingDefaults(settings: PersistedUserSettings & Partial<RuntimeOnlySettings>): UserSettings {
  return {
    ...settings,
    workingHoursEnabled: settings.workingHoursEnabled ?? false,
    workingHoursStart: settings.workingHoursStart ?? "09:00",
    workingHoursEnd: settings.workingHoursEnd ?? "22:00",
    workingDays: settings.workingDays ?? ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday"],
    offHoursMessage:
      settings.offHoursMessage ?? "شكراً لتواصلك 🙏 نحن حالياً خارج أوقات العمل. سنرد عليك فور بدء الدوام.",
    timezone: settings.timezone ?? "Africa/Cairo",
    csatEnabled: settings.csatEnabled ?? false,
    notificationPrefs: settings.notificationPrefs ?? DEFAULT_NOTIFICATION_PREFS,
  };
}

type RuntimeOnlySettings = Pick<
  UserSettings,
  | "workingHoursEnabled"
  | "workingHoursStart"
  | "workingHoursEnd"
  | "workingDays"
  | "offHoursMessage"
  | "timezone"
  | "csatEnabled"
  | "notificationPrefs"
>;

export type UserSettingsUpdateData = Partial<
  Pick<
    UserSettings,
    | "systemPrompt"
    | "autoReplyEnabled"
    | "language"
    | "businessName"
    | "businessContext"
    | "fallbackMessage"
    | "maxReplyLength"
    | "workingHoursEnabled"
    | "workingHoursStart"
    | "workingHoursEnd"
    | "workingDays"
    | "offHoursMessage"
    | "timezone"
    | "csatEnabled"
  >
> & {
  notificationPrefs?: Prisma.InputJsonValue;
};

export async function getOrCreateUserSettings(userId: string): Promise<UserSettings> {
  await prisma.$executeRaw`
    INSERT INTO "user_settings" ("id", "user_id", "system_prompt", "updated_at")
    VALUES (gen_random_uuid(), ${userId}::uuid, ${DEFAULT_SYSTEM_PROMPT}, CURRENT_TIMESTAMP)
    ON CONFLICT ("user_id") DO NOTHING
  `;

  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: persistedUserSettingsSelect,
  });

  if (!settings) {
    throw new Error("Unable to load user settings.");
  }

  return withRuntimeSettingDefaults(settings);
}

export async function updateUserSettings(userId: string, data: UserSettingsUpdateData): Promise<UserSettings> {
  await getOrCreateUserSettings(userId);

  const persistedData = {
    ...(data.systemPrompt !== undefined ? { systemPrompt: data.systemPrompt } : {}),
    ...(data.autoReplyEnabled !== undefined ? { autoReplyEnabled: data.autoReplyEnabled } : {}),
    ...(data.language !== undefined ? { language: data.language } : {}),
    ...(data.businessName !== undefined ? { businessName: data.businessName } : {}),
    ...(data.businessContext !== undefined ? { businessContext: data.businessContext } : {}),
    ...(data.fallbackMessage !== undefined ? { fallbackMessage: data.fallbackMessage } : {}),
    ...(data.maxReplyLength !== undefined ? { maxReplyLength: data.maxReplyLength } : {}),
  };

  if (Object.keys(persistedData).length > 0) {
    await prisma.userSettings.update({
      where: { userId },
      data: persistedData,
      select: persistedUserSettingsSelect,
    });
  }

  return getOrCreateUserSettings(userId);
}

export function buildFallbackMessage(settings: UserSettings): string {
  return settings.fallbackMessage?.trim() || "Thanks for your message. A team member will follow up soon.";
}
