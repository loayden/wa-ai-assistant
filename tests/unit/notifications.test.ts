import { beforeEach, describe, expect, it, vi } from "vitest";

const notificationMocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
  prisma: {
    conversationHandoff: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/resend/client", () => ({
  sendEmail: notificationMocks.sendEmail,
}));

vi.mock("@/lib/prisma/client", () => ({
  prisma: notificationMocks.prisma,
}));

vi.mock("@/lib/utils/logger", () => ({
  logger: {
    warn: vi.fn(),
  },
}));

import { sendConversationNotificationOnce } from "@/lib/notifications/events";

describe("sendConversationNotificationOnce", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notificationMocks.sendEmail.mockResolvedValue({ id: "email-1" });
    notificationMocks.prisma.conversationHandoff.upsert.mockResolvedValue({});
  });

  it("does not send duplicate notifications for the same event", async () => {
    notificationMocks.prisma.conversationHandoff.findUnique.mockResolvedValueOnce({
      notifiedEvents: ["lead"],
    });

    const result = await sendConversationNotificationOnce({
      userId: "user-1",
      ownerEmail: "owner@example.com",
      connectionId: "connection-1",
      customerPhone: "201144999221",
      event: "lead",
      subject: "Lead",
      html: "<p>Lead</p>",
    });

    expect(result).toEqual({ sent: false, reason: "duplicate" });
    expect(notificationMocks.sendEmail).not.toHaveBeenCalled();
    expect(notificationMocks.prisma.conversationHandoff.upsert).not.toHaveBeenCalled();
  });

  it("records the event after a notification is sent", async () => {
    notificationMocks.prisma.conversationHandoff.findUnique.mockResolvedValueOnce({
      notifiedEvents: ["angry"],
    });

    const result = await sendConversationNotificationOnce({
      userId: "user-1",
      ownerEmail: "owner@example.com",
      connectionId: "connection-1",
      customerPhone: "201144999221",
      event: "handoff",
      subject: "Handoff",
      html: "<p>Handoff</p>",
    });

    expect(result).toEqual({ sent: true });
    expect(notificationMocks.sendEmail).toHaveBeenCalledWith({
      to: "owner@example.com",
      subject: "Handoff",
      html: "<p>Handoff</p>",
    });
    expect(notificationMocks.prisma.conversationHandoff.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: {
          notifiedEvents: ["angry", "handoff"],
        },
      }),
    );
  });
});
