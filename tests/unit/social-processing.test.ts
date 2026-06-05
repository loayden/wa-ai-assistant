import { MessageDirection, MessageStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const socialMocks = vi.hoisted(() => {
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

  return {
    AIReplyError,
    sendText: vi.fn(),
    getOrCreateUserSettings: vi.fn(),
    generateAIReply: vi.fn(),
    detectSocialIntent: vi.fn(),
    getOrUpsertCustomerProfile: vi.fn(),
    checkSubscriptionLimit: vi.fn(),
    incrementReplyCount: vi.fn(),
    prisma: {
      whatsAppConnection: { findFirst: vi.fn() },
      message: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
      conversationHandoff: { findUnique: vi.fn(), upsert: vi.fn() },
      routingRule: { findMany: vi.fn() },
      lead: { findFirst: vi.fn(), create: vi.fn() },
      $transaction: vi.fn(),
    },
  };
});

vi.mock("@/lib/api/settings", () => ({
  buildFallbackMessage: (settings: { fallbackMessage?: string | null }) =>
    settings.fallbackMessage?.trim() || "شكراً لتواصلك. سيقوم أحد أفراد الفريق بالرد عليك قريباً.",
  getOrCreateUserSettings: socialMocks.getOrCreateUserSettings,
}));

vi.mock("@/lib/assistant/working-hours", () => ({
  isWithinWorkingHours: vi.fn(() => true),
}));

vi.mock("@/lib/ai/leads", () => ({
  detectLeadIntent: vi.fn(() => ({ isLead: false })),
}));

vi.mock("@/lib/ai/mood", () => ({
  detectAngryTone: vi.fn(() => false),
}));

vi.mock("@/lib/ai/social-intent", () => ({
  detectSocialIntent: socialMocks.detectSocialIntent,
}));

vi.mock("@/lib/ai/topic-routing", () => ({
  detectTopicFromText: vi.fn(() => "general"),
  findRoutingRuleForTopic: vi.fn(() => null),
}));

vi.mock("@/lib/channels", () => ({
  getAdapter: vi.fn(() => ({ sendText: socialMocks.sendText })),
}));

vi.mock("@/lib/customers/profiles", () => ({
  getOrUpsertCustomerProfile: socialMocks.getOrUpsertCustomerProfile,
}));

vi.mock("@/lib/openai/client", () => ({
  AIReplyError: socialMocks.AIReplyError,
  generateAIReply: socialMocks.generateAIReply,
}));

vi.mock("@/lib/prisma/client", () => ({
  prisma: socialMocks.prisma,
}));

vi.mock("@/lib/resend/client", () => ({
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/utils/encryption", () => ({
  decrypt: vi.fn(() => "page-token"),
}));

vi.mock("@/lib/utils/env", () => ({
  appEnv: {
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    WHATSAPP_API_VERSION: "v19.0",
    WHATSAPP_MOCK_MODE: false,
  },
}));

vi.mock("@/lib/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/utils/subscription", () => ({
  checkSubscriptionLimit: socialMocks.checkSubscriptionLimit,
  incrementReplyCount: socialMocks.incrementReplyCount,
}));

import { processSocialMessage } from "@/lib/channels/social-processing";

const USER_ID = "00000000-0000-0000-0000-000000000001";
const CONNECTION_ID = "00000000-0000-0000-0000-000000000002";
const INBOUND_ID = "00000000-0000-0000-0000-000000000003";
const FALLBACK_TEXT = "شكراً لتواصلك. هنرد عليك قريباً.";

const instagramMessage = {
  channel: "instagram" as const,
  externalMessageId: "ig-mid-1",
  externalThreadId: "igsid-1",
  instagramAccountId: "ig-account-1",
  text: "تفاصيل",
  messageType: "text" as const,
  timestamp: 1770000000000,
  rawPayload: { message: { text: "تفاصيل" } },
};

function mockConnection() {
  socialMocks.prisma.whatsAppConnection.findFirst.mockResolvedValue({
    id: CONNECTION_ID,
    userId: USER_ID,
    phoneNumberId: "ig-account-1",
    accessToken: "encrypted-page-token",
    pageAccessTokenEncrypted: "encrypted-page-token",
    facebookPageId: "page-1",
    instagramAccountId: "ig-account-1",
    channel: "instagram",
    user: { email: "owner@example.com" },
  });
}

function mockSettings() {
  socialMocks.getOrCreateUserSettings.mockResolvedValue({
    userId: USER_ID,
    systemPrompt: "Reply as {businessName}.",
    businessName: "FR3",
    businessContext: null,
    language: "ar",
    fallbackMessage: FALLBACK_TEXT,
    maxReplyLength: 300,
    autoReplyEnabled: true,
    workingHoursEnabled: false,
    workingHoursStart: "09:00",
    workingHoursEnd: "22:00",
    workingDays: ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday"],
    offHoursMessage: "خارج أوقات العمل.",
    timezone: "Africa/Cairo",
    instagramTone: "friendly",
    messengerTone: "professional",
    instagramInstructions: null,
    messengerInstructions: null,
  });
}

describe("processSocialMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnection();
    mockSettings();
    socialMocks.prisma.message.findFirst.mockResolvedValue(null);
    socialMocks.prisma.message.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: data.direction === MessageDirection.INBOUND ? INBOUND_ID : "00000000-0000-0000-0000-000000000004",
        metadata: data.metadata ?? {},
        ...data,
      }),
    );
    socialMocks.prisma.message.findUnique.mockResolvedValue({ metadata: {} });
    socialMocks.prisma.message.update.mockResolvedValue({});
    socialMocks.prisma.conversationHandoff.findUnique.mockResolvedValue(null);
    socialMocks.prisma.routingRule.findMany.mockResolvedValue([]);
    socialMocks.prisma.lead.findFirst.mockResolvedValue(null);
    socialMocks.prisma.lead.create.mockResolvedValue({});
    socialMocks.prisma.$transaction.mockImplementation((operations) => Promise.all(operations));
    socialMocks.detectSocialIntent.mockResolvedValue("general");
    socialMocks.getOrUpsertCustomerProfile.mockResolvedValue({});
    socialMocks.checkSubscriptionLimit.mockResolvedValue({ allowed: true });
  });

  it("sends a fallback Instagram reply when OpenAI quota is unavailable", async () => {
    socialMocks.generateAIReply.mockRejectedValueOnce(new socialMocks.AIReplyError("OPENAI_RATE_LIMIT", "quota"));
    socialMocks.sendText.mockResolvedValueOnce({ success: true, externalMessageId: "fallback-mid" });

    await processSocialMessage(instagramMessage);

    expect(socialMocks.sendText).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: "page-token",
        phoneNumberId: "ig-account-1",
        recipientId: "igsid-1",
        text: FALLBACK_TEXT,
      }),
    );
    expect(socialMocks.prisma.message.update).toHaveBeenCalledWith({
      where: { id: INBOUND_ID },
      data: expect.objectContaining({
        status: MessageStatus.REPLIED,
        aiReplyText: FALLBACK_TEXT,
        aiModelUsed: "fallback-ai-unavailable",
      }),
    });
    expect(socialMocks.prisma.message.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        direction: MessageDirection.OUTBOUND,
        bodyText: FALLBACK_TEXT,
        channel: "instagram",
        externalMessageId: "fallback-mid",
      }),
    });
    expect(socialMocks.incrementReplyCount).toHaveBeenCalledWith(USER_ID);
  });

  it("keeps the Instagram message failed when fallback delivery is rejected", async () => {
    socialMocks.generateAIReply.mockRejectedValueOnce(new socialMocks.AIReplyError("OPENAI_RATE_LIMIT", "quota"));
    socialMocks.sendText.mockResolvedValueOnce({ success: false, error: "Meta send failed" });

    await processSocialMessage(instagramMessage);

    expect(socialMocks.prisma.message.update).toHaveBeenCalledWith({
      where: { id: INBOUND_ID },
      data: expect.objectContaining({
        status: MessageStatus.FAILED,
        aiReplyText: "لم يتم إرسال الرد لأن المساعد غير متاح مؤقتاً.",
        aiModelUsed: "fallback-send-failed",
        metadata: expect.objectContaining({
          autoReplyFailure: expect.objectContaining({
            stage: "fallback_send",
            channel: "instagram",
            metaError: "Meta send failed",
            aiFailure: "OPENAI_RATE_LIMIT",
          }),
        }),
      }),
    });
    expect(socialMocks.incrementReplyCount).not.toHaveBeenCalled();
  });
});
