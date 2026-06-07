// FILE: tests/api/conversation-handoff.test.ts
/*
 * [ROLE: QA ENGINEER]
 * Decision: Handoff tests use an existing message id as the thread handle,
 * matching the current flat message schema without introducing a conversation table.
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
    whatsappClient: {
      sendMessage: vi.fn(),
    },
    decrypt: vi.fn((value: string) => `decrypted:${value}`),
    appEnv: {
      WHATSAPP_MOCK_MODE: false,
    },
    prisma: {
      $executeRaw: vi.fn(),
      message: {
        create: vi.fn(),
        findFirst: vi.fn(),
      },
      outboundMessage: {
        create: vi.fn(),
        update: vi.fn(),
      },
      conversationHandoff: {
        upsert: vi.fn(),
        updateMany: vi.fn(),
      },
      userSettings: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
      whatsAppConnection: {
        findFirst: vi.fn(),
      },
    },
  };
});

vi.mock("@/lib/api/auth", () => ({
  UnauthorizedError: apiMocks.UnauthorizedError,
  requireAppUser: apiMocks.requireAppUser,
}));

vi.mock("@/lib/api/whatsapp", () => ({
  whatsappClient: apiMocks.whatsappClient,
}));

vi.mock("@/lib/prisma/client", () => ({
  prisma: apiMocks.prisma,
}));

vi.mock("@/lib/utils/encryption", () => ({
  decrypt: apiMocks.decrypt,
}));

vi.mock("@/lib/utils/env", () => ({
  appEnv: apiMocks.appEnv,
}));

vi.mock("@/lib/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { POST as HANDOFF } from "@/app/api/conversations/[id]/handoff/route";
import { POST as REPLY } from "@/app/api/conversations/[id]/reply/route";
import { POST as RESUME } from "@/app/api/conversations/[id]/resume/route";
import { POST as RESOLVE } from "@/app/api/conversations/[id]/resolve/route";

const USER_ID = "00000000-0000-0000-0000-000000000001";
const MESSAGE_ID = "00000000-0000-0000-0000-000000000021";
const CONNECTION_ID = "00000000-0000-0000-0000-000000000031";

function makeMessage() {
  return {
    id: MESSAGE_ID,
    userId: USER_ID,
    connectionId: CONNECTION_ID,
    fromNumber: "201144999221",
    toNumber: "15551421769",
    connection: {
      id: CONNECTION_ID,
      phoneNumberId: "1131188840076693",
      accessToken: "encrypted-token",
      isActive: true,
    },
  };
}

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/conversations/id/reply", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("conversation handoff API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.requireAppUser.mockResolvedValue({ id: USER_ID });
    apiMocks.prisma.message.findFirst.mockResolvedValue(makeMessage());
    apiMocks.prisma.$executeRaw.mockResolvedValue(1);
    apiMocks.prisma.userSettings.findUnique.mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000061",
      userId: USER_ID,
      systemPrompt: "system prompt",
      autoReplyEnabled: true,
      language: "ar",
      businessName: "Kallem",
      businessContext: null,
      fallbackMessage: null,
      maxReplyLength: 300,
      workingHoursEnabled: false,
      workingHoursStart: "09:00",
      workingHoursEnd: "22:00",
      workingDays: ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday"],
      offHoursMessage: "شكراً لتواصلك 🙏 نحن حالياً خارج أوقات العمل. سنرد عليك فور بدء الدوام.",
      timezone: "Africa/Cairo",
      csatEnabled: true,
      notificationPrefs: {
        angry: true,
        lead: true,
        handoff: true,
        daily_summary: false,
        weekly_report: true,
        ai_failed: true,
      },
      createdAt: new Date("2026-05-23T10:00:00.000Z"),
      updatedAt: new Date("2026-05-23T10:00:00.000Z"),
    });
    apiMocks.prisma.conversationHandoff.upsert.mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000041",
      active: true,
      resolvedAt: new Date("2026-05-23T10:00:00.000Z"),
      rating: null,
      ratingRequestedAt: new Date("2026-05-23T10:00:00.000Z"),
    });
    apiMocks.prisma.conversationHandoff.updateMany.mockResolvedValue({ count: 1 });
    apiMocks.whatsappClient.sendMessage.mockResolvedValue({
      messages: [{ id: "wamid.manual" }],
    });
    apiMocks.prisma.message.create.mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000051",
    });
    apiMocks.prisma.outboundMessage.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: "00000000-0000-0000-0000-000000000071",
        attemptCount: data.attemptCount ?? 1,
        maxAttempts: data.maxAttempts ?? 3,
        channel: data.channel,
        direction: data.direction,
        ...data,
      }),
    );
    apiMocks.prisma.outboundMessage.update.mockImplementation(({ data }) =>
      Promise.resolve({
        id: "00000000-0000-0000-0000-000000000071",
        ...data,
      }),
    );
  });

  it("activates handoff for the selected thread", async () => {
    const response = await HANDOFF(new Request("http://localhost/api/conversations/id/handoff", { method: "POST" }), {
      params: Promise.resolve({ id: MESSAGE_ID }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.handoff.active).toBe(true);
    expect(apiMocks.prisma.conversationHandoff.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_connectionId_customerPhone: {
            userId: USER_ID,
            connectionId: CONNECTION_ID,
            customerPhone: "201144999221",
          },
        },
      }),
    );
  });

  it("resumes AI for the selected thread", async () => {
    const response = await RESUME(new Request("http://localhost/api/conversations/id/resume", { method: "POST" }), {
      params: Promise.resolve({ id: MESSAGE_ID }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.handoff.active).toBe(false);
    expect(apiMocks.prisma.conversationHandoff.updateMany).toHaveBeenCalledWith({
      where: {
        userId: USER_ID,
        connectionId: CONNECTION_ID,
        customerPhone: "201144999221",
      },
      data: {
        active: false,
        resumedAt: expect.any(Date),
      },
    });
  });

  it("sends a manual reply without incrementing AI quota", async () => {
    const response = await REPLY(jsonRequest({ message: "أهلاً، هنتابع مع حضرتك." }), { params: Promise.resolve({ id: MESSAGE_ID }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.messageSent).toBe(true);
    expect(apiMocks.whatsappClient.sendMessage).toHaveBeenCalledWith(
      "1131188840076693",
      "201144999221",
      "أهلاً، هنتابع مع حضرتك.",
      { accessToken: "decrypted:encrypted-token" },
    );
    expect(apiMocks.prisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          direction: "OUTBOUND",
          bodyText: "أهلاً، هنتابع مع حضرتك.",
        }),
      }),
    );
  });

  it("records a failed manual reply with a classified failure reason", async () => {
    apiMocks.whatsappClient.sendMessage.mockRejectedValueOnce({
      status: 400,
      response: {
        error: {
          code: 131030,
          message: "Recipient not in test list.",
        },
      },
    });

    const response = await REPLY(jsonRequest({ message: "أهلاً، هنتابع مع حضرتك." }), { params: Promise.resolve({ id: MESSAGE_ID }) });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toContain("رقم Meta الاختباري");
    expect(body.meta.failure.code).toBe("meta_test_recipient_blocked");
    expect(body.meta.messageId).toBe("00000000-0000-0000-0000-000000000051");
    expect(body.meta.outboxId).toBe("00000000-0000-0000-0000-000000000071");
    expect(apiMocks.prisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          direction: "OUTBOUND",
          bodyText: "أهلاً، هنتابع مع حضرتك.",
          status: "FAILED",
          aiModelUsed: "manual-reply",
          metadata: expect.objectContaining({
            outboxId: "00000000-0000-0000-0000-000000000071",
            outboundAttempt: expect.objectContaining({
              direction: "manual",
              stage: "blocked",
              failure: expect.objectContaining({
                code: "meta_test_recipient_blocked",
                retry: { canRetry: false, reason: "requires_setup" },
              }),
            }),
          }),
        }),
      }),
    );
  });

  it("resolves a conversation and sends a CSAT request when enabled", async () => {
    const response = await RESOLVE(new Request("http://localhost/api/conversations/id/resolve", { method: "POST" }), {
      params: Promise.resolve({ id: MESSAGE_ID }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.resolved).toBe(true);
    expect(body.data.ratingRequested).toBe(true);
    expect(apiMocks.whatsappClient.sendMessage).toHaveBeenCalledWith(
      "1131188840076693",
      "201144999221",
      expect.stringContaining("كيف تقيّم تجربتك"),
      { accessToken: "decrypted:encrypted-token" },
    );
    expect(apiMocks.prisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          direction: "OUTBOUND",
          aiModelUsed: "csat-request",
        }),
      }),
    );
    expect(apiMocks.prisma.conversationHandoff.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          active: false,
          resolvedAt: expect.any(Date),
          ratingRequestedAt: expect.any(Date),
        }),
      }),
    );
  });
});
