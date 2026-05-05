// FILE: src/lib/api/settings.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Settings are lazily created so every tenant has a usable default
 * prompt before onboarding forms or webhook processing complete.
 */
import "server-only";

import type { UserSettings } from "@prisma/client";

import { prisma } from "@/lib/prisma/client";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/utils/constants";

export async function getOrCreateUserSettings(userId: string): Promise<UserSettings> {
  return prisma.userSettings.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
    },
  });
}

export function buildFallbackMessage(settings: UserSettings): string {
  return settings.fallbackMessage?.trim() || "Thanks for your message. A team member will follow up soon.";
}
