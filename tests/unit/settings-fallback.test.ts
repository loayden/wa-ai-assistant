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

  it("ignores the legacy English default fallback so business context can personalize the reply", () => {
    const reply = buildFallbackMessage(
      settings({
        businessContext: "معسكر صيفي لتعليم البرمجة للأطفال من 10 سنوات.",
        fallbackMessage: "Thanks for your message. A team member will follow up soon.",
      }),
    );

    expect(reply).toContain("Genius Academy");
    expect(reply).toContain("معسكر صيفي");
  });

  it("allows fallback replies up to the configured 1000 character maximum", () => {
    const businessContext = "تفاصيل النشاط ".repeat(55);
    const reply = buildFallbackMessage(settings({ businessContext, maxReplyLength: 1000 }));

    expect(reply.length).toBeGreaterThan(500);
    expect(reply.length).toBeLessThanOrEqual(1000);
  });
});
