// FILE: tests/unit/aiReply.test.ts
/*
 * [ROLE: QA ENGINEER]
 * Decision: AI reply tests mock the OpenAI SDK at the module boundary so prompt
 * interpolation, token logging, and error mapping are deterministic.
 */
import type { UserSettings } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const openAiMock = vi.hoisted(() => {
  class RateLimitError extends Error {
    status = 429;
  }

  class APIConnectionTimeoutError extends Error {}

  class APIError extends Error {
    status: number;

    constructor(message = "api error", status = 500) {
      super(message);
      this.status = status;
    }
  }

  return {
    create: vi.fn(),
    RateLimitError,
    APIConnectionTimeoutError,
    APIError,
  };
});

const prismaMock = vi.hoisted(() => ({
  knowledgeBaseEntry: {
    findMany: vi.fn(),
  },
  product: {
    findMany: vi.fn(),
  },
  aiCorrection: {
    findMany: vi.fn(),
  },
}));

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: openAiMock.create,
      },
    },
  })),
  RateLimitError: openAiMock.RateLimitError,
  APIConnectionTimeoutError: openAiMock.APIConnectionTimeoutError,
  APIError: openAiMock.APIError,
}));

vi.mock("@/lib/prisma/client", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { generateAIReply } from "@/lib/openai/client";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/utils/constants";

const settings: UserSettings = {
  id: "00000000-0000-0000-0000-000000000010",
  userId: "00000000-0000-0000-0000-000000000001",
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  autoReplyEnabled: true,
  language: "en",
  businessName: "Acme Bakery",
  businessContext: "We sell fresh bread and close at 7 PM.",
  fallbackMessage: null,
  maxReplyLength: 80,
  workingHoursEnabled: false,
  workingHoursStart: "09:00",
  workingHoursEnd: "22:00",
  workingDays: ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday"],
  offHoursMessage: "شكراً لتواصلك 🙏 نحن حالياً خارج أوقات العمل. سنرد عليك فور بدء الدوام.",
  timezone: "Africa/Cairo",
  csatEnabled: false,
  notificationPrefs: {
    angry: true,
    lead: true,
    handoff: true,
    ai_failed: true,
    daily_summary: false,
    weekly_report: true,
  },
  commentToDmEnabled: false,
  commentToDmMessage: "مرحباً! شكراً لاهتمامك. كيف يمكنني مساعدتك؟",
  instagramTone: "friendly",
  messengerTone: "professional",
  instagramInstructions: null,
  messengerInstructions: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("generateAIReply", () => {
  beforeEach(() => {
    openAiMock.create.mockReset();
    prismaMock.knowledgeBaseEntry.findMany.mockReset();
    prismaMock.product.findMany.mockReset();
    prismaMock.aiCorrection.findMany.mockReset();
    prismaMock.knowledgeBaseEntry.findMany.mockResolvedValue([]);
    prismaMock.product.findMany.mockResolvedValue([]);
    prismaMock.aiCorrection.findMany.mockResolvedValue([]);
  });

  it("generates a clamped reply and returns model usage", async () => {
    openAiMock.create.mockResolvedValueOnce({
      choices: [{ message: { content: " Yes, we are open until 7 PM today. " } }],
      model: "gpt-4o",
      usage: { total_tokens: 42 },
    });

    const result = await generateAIReply({
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      userMessage: "Are you open today?",
      settings,
    });

    expect(result).toEqual({
      replyText: "Yes, we are open until 7 PM today.",
      modelUsed: "gpt-4o",
      tokensUsed: 42,
    });
  });

  it("interpolates prompt settings and appends business context", async () => {
    openAiMock.create.mockResolvedValueOnce({
      choices: [{ message: { content: "Hello." } }],
      model: "gpt-4o",
      usage: { total_tokens: 5 },
    });

    await generateAIReply({
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      userMessage: "Hi",
      settings,
    });

    const request = openAiMock.create.mock.calls[0][0];

    expect(request.messages[0].content).toContain("Acme Bakery");
    expect(request.messages[0].content).toContain("Respond in en");
    expect(request.messages[0].content).toContain("Keep replies under\n80 characters");
    expect(request.messages[0].content).toContain("We sell fresh bread and close at 7 PM.");
  });

  it("adds saved knowledge entries to the system prompt", async () => {
    prismaMock.knowledgeBaseEntry.findMany.mockResolvedValueOnce([
      {
        type: "faq",
        title: "Delivery",
        content: "Delivery is available across Cairo until midnight.",
      },
    ]);
    openAiMock.create.mockResolvedValueOnce({
      choices: [{ message: { content: "Delivery is available across Cairo until midnight." } }],
      model: "gpt-4o",
      usage: { total_tokens: 9 },
    });

    await generateAIReply({
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      userMessage: "Do you deliver?",
      settings,
    });

    const request = openAiMock.create.mock.calls[0][0];

    expect(prismaMock.knowledgeBaseEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: settings.userId },
      }),
    );
    expect(request.messages[0].content).toContain("Business Knowledge");
    expect(request.messages[0].content).toContain("[FAQ: Delivery]");
    expect(request.messages[0].content).toContain("Delivery is available across Cairo until midnight.");
  });

  it("uses channel-specific persona settings for Instagram", async () => {
    openAiMock.create.mockResolvedValueOnce({
      choices: [{ message: { content: "تمام، بعتلك التفاصيل ❤️" } }],
      model: "gpt-4o",
      usage: { total_tokens: 12 },
    });

    await generateAIReply({
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      userMessage: "بكام؟",
      settings: {
        ...settings,
        instagramTone: "playful",
        instagramInstructions: "استخدم أسلوب قصير مناسب لتعليقات وإنستجرام.",
      },
      channel: "instagram",
    });

    const request = openAiMock.create.mock.calls[0][0];

    expect(request.messages[0].content).toContain("Instagram channel persona");
    expect(request.messages[0].content).toContain("playful");
    expect(request.messages[0].content).toContain("استخدم أسلوب قصير مناسب لتعليقات وإنستجرام.");
  });

  it("maps OpenAI rate limits to AIReplyError", async () => {
    openAiMock.create.mockRejectedValueOnce(new openAiMock.RateLimitError("rate limited"));

    await expect(
      generateAIReply({
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        userMessage: "Hi",
        settings,
      }),
    ).rejects.toMatchObject({ code: "OPENAI_RATE_LIMIT", status: 429 });
  });

  it("maps OpenAI timeouts to AIReplyError", async () => {
    openAiMock.create.mockRejectedValueOnce(new openAiMock.APIConnectionTimeoutError("timeout"));

    await expect(
      generateAIReply({
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        userMessage: "Hi",
        settings,
      }),
    ).rejects.toMatchObject({ code: "OPENAI_TIMEOUT" });
  });

  it("rejects empty OpenAI responses", async () => {
    openAiMock.create.mockResolvedValueOnce({
      choices: [{ message: { content: "   " } }],
      model: "gpt-4o",
      usage: { total_tokens: 3 },
    });

    await expect(
      generateAIReply({
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        userMessage: "Hi",
        settings,
      }),
    ).rejects.toMatchObject({ code: "OPENAI_INVALID_RESPONSE" });
  });
});
