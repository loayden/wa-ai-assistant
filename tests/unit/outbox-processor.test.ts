import { OutboundMessageStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const outboxMocks = vi.hoisted(() => ({
  sendText: vi.fn(),
  decrypt: vi.fn(() => "decrypted-token"),
  prisma: {
    outboundMessage: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    message: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/channels", () => ({
  getAdapter: vi.fn(() => ({ sendText: outboxMocks.sendText })),
}));

vi.mock("@/lib/prisma/client", () => ({
  prisma: outboxMocks.prisma,
}));

vi.mock("@/lib/utils/encryption", () => ({
  decrypt: outboxMocks.decrypt,
}));

vi.mock("@/lib/utils/env", () => ({
  appEnv: {
    WHATSAPP_MOCK_MODE: false,
  },
}));

vi.mock("@/lib/utils/logger", () => ({
  logger: {
    warn: vi.fn(),
  },
}));

import { createOutboundDelivery, processOutboundQueue } from "@/lib/reliability/outbox";

const dueOutbox = {
  id: "00000000-0000-0000-0000-000000000101",
  userId: "00000000-0000-0000-0000-000000000001",
  connectionId: "00000000-0000-0000-0000-000000000002",
  relatedMessageId: null,
  idempotencyKey: "instagram:auto:test",
  channel: "instagram",
  direction: "auto",
  senderId: "ig-account-1",
  recipientId: "igsid-1",
  bodyText: "أهلاً بك.",
  externalThreadId: "igsid-1",
  status: OutboundMessageStatus.FAILED,
  attemptCount: 1,
  maxAttempts: 3,
  nextAttemptAt: new Date("2026-06-06T00:00:00.000Z"),
  lastAttemptAt: new Date("2026-06-06T00:00:00.000Z"),
  sentAt: null,
  providerMessageId: null,
  failureCode: "network_error",
  failureReason: "temporary",
  failureActionHref: "/messages",
  metadata: {},
  createdAt: new Date("2026-06-06T00:00:00.000Z"),
  updatedAt: new Date("2026-06-06T00:00:00.000Z"),
  connection: {
    accessToken: "encrypted-whatsapp-token",
    pageAccessTokenEncrypted: "encrypted-page-token",
    facebookPageId: "page-1",
  },
};

describe("processOutboundQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    outboxMocks.prisma.outboundMessage.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: "00000000-0000-0000-0000-000000000301",
        ...data,
      }),
    );
    outboxMocks.prisma.outboundMessage.updateMany.mockResolvedValue({ count: 1 });
    outboxMocks.prisma.outboundMessage.update.mockImplementation(({ data }) => Promise.resolve({ ...dueOutbox, ...data }));
    outboxMocks.prisma.message.findUnique.mockResolvedValue(null);
    outboxMocks.prisma.message.create.mockResolvedValue({ id: "00000000-0000-0000-0000-000000000201" });
    outboxMocks.prisma.message.update.mockResolvedValue({});
  });

  it("creates a pending outbox record before the first send attempt starts", async () => {
    const client = {
      outboundMessage: {
        create: outboxMocks.prisma.outboundMessage.create,
      },
    } as unknown as Parameters<typeof createOutboundDelivery>[1];

    await createOutboundDelivery(
      {
        userId: dueOutbox.userId,
        connectionId: dueOutbox.connectionId,
        channel: "instagram",
        direction: "auto",
        senderId: "ig-account-1",
        recipientId: "igsid-1",
        bodyText: "أهلاً بك.",
      },
      client,
    );

    expect(outboxMocks.prisma.outboundMessage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: OutboundMessageStatus.PENDING,
        attemptCount: 0,
        metadata: expect.objectContaining({
          outboundAttempt: expect.objectContaining({
            channel: "instagram",
            direction: "auto",
            stage: "pending",
          }),
        }),
      }),
    });
  });

  it("retries a due transient outbox message and records the visible outbound message", async () => {
    outboxMocks.prisma.outboundMessage.findMany.mockResolvedValue([dueOutbox]);
    outboxMocks.sendText.mockResolvedValue({ success: true, externalMessageId: "mid-retry-1" });

    const result = await processOutboundQueue({ batchSize: 1 });

    expect(result).toEqual(expect.objectContaining({ candidates: 1, retried: 1, sent: 1 }));
    expect(outboxMocks.prisma.outboundMessage.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: dueOutbox.id,
          status: OutboundMessageStatus.FAILED,
        }),
        data: expect.objectContaining({
          status: OutboundMessageStatus.RETRYING,
          metadata: expect.objectContaining({
            outboundAttempt: expect.objectContaining({
              stage: "retrying",
            }),
          }),
        }),
      }),
    );
    expect(outboxMocks.sendText).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: "igsid-1",
        text: "أهلاً بك.",
        accessToken: "decrypted-token",
        phoneNumberId: "ig-account-1",
      }),
    );
    expect(outboxMocks.prisma.message.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        direction: "OUTBOUND",
        bodyText: "أهلاً بك.",
        externalMessageId: "mid-retry-1",
        metadata: expect.objectContaining({
          outboxId: dueOutbox.id,
        }),
      }),
    });
    expect(outboxMocks.prisma.outboundMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: dueOutbox.id },
        data: expect.objectContaining({
          status: OutboundMessageStatus.SENT,
          providerMessageId: "mid-retry-1",
        }),
      }),
    );
  });

  it("keeps retryable failures scheduled instead of blocking the channel", async () => {
    outboxMocks.prisma.outboundMessage.findMany.mockResolvedValue([dueOutbox]);
    outboxMocks.sendText.mockResolvedValue({ success: false, error: "timeout" });

    const result = await processOutboundQueue({ batchSize: 1 });

    expect(result).toEqual(expect.objectContaining({ candidates: 1, retried: 1, failed: 1 }));
    expect(outboxMocks.prisma.outboundMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: dueOutbox.id },
        data: expect.objectContaining({
          status: OutboundMessageStatus.FAILED,
          nextAttemptAt: expect.any(Date),
          failureCode: "network_error",
        }),
      }),
    );
  });

  it("blocks exhausted outbox messages without sending again", async () => {
    outboxMocks.prisma.outboundMessage.findMany.mockResolvedValue([
      {
        ...dueOutbox,
        attemptCount: 3,
        maxAttempts: 3,
      },
    ]);

    const result = await processOutboundQueue({ batchSize: 1 });

    expect(result).toEqual(expect.objectContaining({ candidates: 1, blocked: 1, retried: 0 }));
    expect(outboxMocks.sendText).not.toHaveBeenCalled();
    expect(outboxMocks.prisma.outboundMessage.update).toHaveBeenCalledWith({
      where: { id: dueOutbox.id },
      data: { status: OutboundMessageStatus.BLOCKED, nextAttemptAt: null },
    });
  });
});
