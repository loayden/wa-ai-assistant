// FILE: tests/api/assistant-test.test.ts
/*
 * [ROLE: QA ENGINEER]
 * Decision: Assistant test messages should exercise the AI path without
 * consuming quota or sending outbound WhatsApp messages.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => {
  class AIReplyError extends Error {
    public readonly code: "OPENAI_RATE_LIMIT" | "OPENAI_TIMEOUT" | "OPENAI_API_ERROR" | "OPENAI_INVALID_RESPONSE";

    constructor(
      code: "OPENAI_RATE_LIMIT" | "OPENAI_TIMEOUT" | "OPENAI_API_ERROR" | "OPENAI_INVALID_RESPONSE",
      message: string,
    ) {
      super(message);
      this.name = "AIReplyError";
      this.code = code;
    }
  }

  class UnauthorizedError extends Error {
    constructor(message = "Authentication required.") {
      super(message);
      this.name = "UnauthorizedError";
    }
  }

  return {
    AIReplyError,
    UnauthorizedError,
    requireAppUser: vi.fn(),
    getOrCreateUserSettings: vi.fn(),
    generateAIReply: vi.fn(),
    prisma: {
      whatsAppConnection: {
        count: vi.fn(),
      },
      knowledgeBaseEntry: {
        count: vi.fn(),
      },
      user: {
        update: vi.fn(),
      },
    },
  };
});

vi.mock("@/lib/api/auth", () => ({
  UnauthorizedError: apiMocks.UnauthorizedError,
  requireAppUser: apiMocks.requireAppUser,
}));

vi.mock("@/lib/api/settings", () => ({
  getOrCreateUserSettings: apiMocks.getOrCreateUserSettings,
}));

vi.mock("@/lib/openai/client", () => ({
  AIReplyError: apiMocks.AIReplyError,
  generateAIReply: apiMocks.generateAIReply,
}));

vi.mock("@/lib/prisma/client", () => ({
  prisma: apiMocks.prisma,
}));

vi.mock("@/lib/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { POST } from "@/app/api/assistant/test/route";

const USER_ID = "00000000-0000-0000-0000-000000000001";

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/assistant/test", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("assistant test API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.requireAppUser.mockResolvedValue({
      id: USER_ID,
      onboardingCompleted: false,
    });
    apiMocks.getOrCreateUserSettings.mockResolvedValue({
      userId: USER_ID,
      systemPrompt: "Reply as {businessName}.",
      businessName: "Kallem",
      businessContext: null,
      language: "en",
      maxReplyLength: 300,
    });
    apiMocks.generateAIReply.mockResolvedValue({
      replyText: "Yes, we can help.",
      modelUsed: "gpt-4o",
      tokensUsed: 18,
      confidence: 0.84,
      sources: [
        {
          id: "business_profile",
          type: "business_profile",
          title: "Kallem",
          excerpt: "Business context",
        },
      ],
      missingData: [],
      needsHuman: false,
      suggestedAction: "reply",
      outsideWorkingHours: false,
    });
    apiMocks.prisma.whatsAppConnection.count.mockResolvedValue(1);
    apiMocks.prisma.knowledgeBaseEntry.count.mockResolvedValue(1);
  });

  it("returns a test reply without requiring a connection id or consuming quota", async () => {
    const response = await POST(jsonRequest({ message: "Do you deliver?" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.replyText).toBe("Yes, we can help.");
    expect(body.data.confidence).toBe(0.84);
    expect(body.data.sources).toEqual([
      expect.objectContaining({
        id: "business_profile",
      }),
    ]);
    expect(body.data.onboardingCompleted).toBe(true);
    expect(apiMocks.generateAIReply).toHaveBeenCalledWith(
      expect.objectContaining({
        userMessage: "Do you deliver?",
      }),
    );
    expect(apiMocks.prisma.user.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { onboardingCompleted: true },
    });
  });

  it("does not complete onboarding until WhatsApp and knowledge exist", async () => {
    apiMocks.prisma.whatsAppConnection.count.mockResolvedValueOnce(0);

    const response = await POST(jsonRequest({ message: "Hello" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.onboardingCompleted).toBe(false);
    expect(apiMocks.prisma.user.update).not.toHaveBeenCalled();
  });

  it("returns a provider-hidden system notice when AI quota is unavailable", async () => {
    apiMocks.generateAIReply.mockRejectedValueOnce(
      new apiMocks.AIReplyError("OPENAI_RATE_LIMIT", "Insufficient quota."),
    );

    const response = await POST(jsonRequest({ message: "هل يوجد توصيل؟" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.replyText).toBe("المساعد غير متاح مؤقتاً. جرّب مرة أخرى بعد قليل أو تواصل مع الدعم.");
    expect(body.data.replyText).not.toContain("OpenAI");
    expect(body.data.modelUsed).toBe("system-notice");
    expect(body.data.tokensUsed).toBe(0);
    expect(body.data.confidence).toBe(0);
    expect(body.data.needsHuman).toBe(true);
    expect(body.data.missingData).toEqual(["ai_provider"]);
    expect(body.data.systemNotice).toBe(true);
    expect(apiMocks.prisma.whatsAppConnection.count).not.toHaveBeenCalled();
  });
});
