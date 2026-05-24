import { beforeEach, describe, expect, it, vi } from "vitest";

const broadcastMocks = vi.hoisted(() => ({
  getOwnedConnectionForTemplates: vi.fn(),
  sendTemplateMessage: vi.fn(),
  prisma: {
    broadcast: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    broadcastRecipient: {
      count: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma/client", () => ({
  prisma: broadcastMocks.prisma,
}));

vi.mock("@/lib/templates/service", () => ({
  getOwnedConnectionForTemplates: broadcastMocks.getOwnedConnectionForTemplates,
}));

vi.mock("@/lib/api/whatsapp", () => ({
  whatsappClient: {
    sendTemplateMessage: broadcastMocks.sendTemplateMessage,
  },
}));

vi.mock("@/lib/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

import { BROADCAST_CRON_BATCH_SIZE, processBroadcastQueue } from "@/lib/broadcasts/processor";

function createBroadcast(overrides = {}) {
  return {
    id: "broadcast-1",
    userId: "00000000-0000-0000-0000-000000000001",
    connectionId: "11111111-1111-1111-1111-111111111111",
    templateId: "22222222-2222-2222-2222-222222222222",
    name: "Test campaign",
    parameters: ["Loay"],
    recipientCount: 75,
    sentCount: 0,
    failedCount: 0,
    status: "sending",
    scheduledAt: null,
    startedAt: new Date("2026-05-24T10:00:00.000Z"),
    completedAt: null,
    createdAt: new Date("2026-05-24T09:00:00.000Z"),
    updatedAt: new Date("2026-05-24T09:00:00.000Z"),
    template: {
      id: "22222222-2222-2222-2222-222222222222",
      connectionId: "11111111-1111-1111-1111-111111111111",
      name: "hello_customer",
      language: "ar",
    },
    ...overrides,
  };
}

function createRecipients(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `recipient-${index}`,
    broadcastId: "broadcast-1",
    phone: `2010000000${String(index).padStart(2, "0")}`,
    name: null,
    status: "pending",
    errorMessage: null,
    sentAt: null,
    createdAt: new Date(`2026-05-24T10:00:${String(index).padStart(2, "0")}.000Z`),
  }));
}

describe("broadcast cron processor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    broadcastMocks.getOwnedConnectionForTemplates.mockResolvedValue({
      phoneNumberId: "phone-number-id",
      decryptedAccessToken: "token",
    });
    broadcastMocks.sendTemplateMessage.mockResolvedValue({ messages: [{ id: "wamid.test" }] });
    broadcastMocks.prisma.broadcast.update.mockResolvedValue({});
    broadcastMocks.prisma.broadcastRecipient.update.mockResolvedValue({});
  });

  it("processes at most 50 pending recipients per cron run", async () => {
    const recipients = createRecipients(BROADCAST_CRON_BATCH_SIZE);

    broadcastMocks.prisma.broadcast.findMany.mockResolvedValue([createBroadcast()]);
    broadcastMocks.prisma.broadcastRecipient.findMany.mockResolvedValue(recipients);
    broadcastMocks.prisma.broadcastRecipient.count
      .mockResolvedValueOnce(50)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(25);

    const result = await processBroadcastQueue({ delayMs: 0 });

    expect(broadcastMocks.prisma.broadcastRecipient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 50,
        where: { broadcastId: "broadcast-1", status: "pending" },
      }),
    );
    expect(broadcastMocks.sendTemplateMessage).toHaveBeenCalledTimes(50);
    expect(result.processedRecipients).toBe(50);
    expect(result.completedBroadcasts).toBe(0);
  });

  it("marks a sending broadcast completed when no pending recipients remain", async () => {
    broadcastMocks.prisma.broadcast.findMany.mockResolvedValue([createBroadcast()]);
    broadcastMocks.prisma.broadcastRecipient.findMany.mockResolvedValue([]);
    broadcastMocks.prisma.broadcastRecipient.count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);

    const result = await processBroadcastQueue({ delayMs: 0 });

    expect(broadcastMocks.prisma.broadcast.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "broadcast-1" },
        data: expect.objectContaining({
          status: "completed",
          sentCount: 2,
          failedCount: 1,
        }),
      }),
    );
    expect(result.completedBroadcasts).toBe(1);
  });

  it("can process one client-driven broadcast batch by id", async () => {
    const recipients = createRecipients(5);

    broadcastMocks.prisma.broadcast.findMany.mockResolvedValue([createBroadcast()]);
    broadcastMocks.prisma.broadcastRecipient.findMany.mockResolvedValue(recipients);
    broadcastMocks.prisma.broadcastRecipient.count
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(70);

    const result = await processBroadcastQueue({ broadcastId: "broadcast-1", maxBroadcasts: 1, batchSize: 5, delayMs: 0 });

    expect(broadcastMocks.prisma.broadcast.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 1,
        where: { id: "broadcast-1", status: "sending" },
      }),
    );
    expect(broadcastMocks.prisma.broadcastRecipient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 5,
      }),
    );
    expect(result.processedRecipients).toBe(5);
  });
});
