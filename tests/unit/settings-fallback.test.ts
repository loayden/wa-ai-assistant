import type { UserSettings } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { buildFallbackMessage } from "@/lib/api/settings";

function settings(overrides: Partial<UserSettings> = {}): UserSettings {
  return {
    id: "settings-1",
    userId: "00000000-0000-0000-0000-000000000001",
    systemPrompt: "Reply as {businessName}.",
    autoReplyEnabled: true,
    language: "ar",
    businessName: "Genius Academy",
    businessContext: null,
    fallbackMessage: null,
    maxReplyLength: 300,
    workingHoursEnabled: false,
    workingHoursStart: "09:00",
    workingHoursEnd: "22:00",
    workingDays: ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday"],
    offHoursMessage: "خارج أوقات العمل.",
    timezone: "Africa/Cairo",
    csatEnabled: false,
    notificationPrefs: {},
    commentToDmEnabled: false,
    commentToDmMessage: "مرحباً",
    instagramTone: "friendly",
    messengerTone: "professional",
    instagramInstructions: null,
    messengerInstructions: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("buildFallbackMessage", () => {
  it("uses a configured fallback message first", () => {
    expect(buildFallbackMessage(settings({ fallbackMessage: "هنرد عليك حالاً." }))).toBe("هنرد عليك حالاً.");
  });

  it("uses business context when OpenAI is unavailable and no custom fallback exists", () => {
    expect(buildFallbackMessage(settings({ businessContext: "دورة صيفية لتعليم البرمجة للطلاب." }))).toContain(
      "دورة صيفية لتعليم البرمجة للطلاب.",
    );
  });
});
