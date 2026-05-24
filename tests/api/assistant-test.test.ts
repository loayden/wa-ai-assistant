// FILE: tests/api/assistant-test.test.ts
/*
 * [ROLE: QA ENGINEER]
 * Decision: Assistant test messages should exercise the AI path without
 * consuming quota or sending outbound WhatsApp messages.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => {
  class UnauthorizedError extends Error {
    constructor(message = "Authentication required.") {
      super(message);
      this.name = "UnauthorizedError";
    }
  }

  return {
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
    });
    apiMocks.prisma.whatsAppConnection.count.mockResolvedValue(1);
    apiMocks.prisma.knowledgeBaseEntry.count.mockResolvedValue(1);
  });

  it("returns a test reply without requiring a connection id or consuming quota", async () => {
    const response = await POST(jsonRequest({ message: "Do you deliver?" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.replyText).toBe("Yes, we can help.");
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
});
