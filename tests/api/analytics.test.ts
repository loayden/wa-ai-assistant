// FILE: tests/api/analytics.test.ts
/*
 * [ROLE: QA ENGINEER]
 * Decision: Analytics tests verify server-side aggregation from existing
 * tenant-owned rows without adding charting dependencies.
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
    prisma: {
      conversationHandoff: {
        count: vi.fn(),
        findMany: vi.fn(),
      },
      lead: {
        count: vi.fn(),
      },
      message: {
        findMany: vi.fn(),
      },
      instagramPostStats: {
        findMany: vi.fn(),
      },
    },
  };
});

vi.mock("@/lib/api/auth", () => ({
  UnauthorizedError: apiMocks.UnauthorizedError,
  requireAppUser: apiMocks.requireAppUser,
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

import { GET } from "@/app/api/analytics/summary/route";

const USER_ID = "00000000-0000-0000-0000-000000000001";

describe("analytics summary API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.requireAppUser.mockResolvedValue({ id: USER_ID, planTier: "PRO" });
    apiMocks.prisma.conversationHandoff.count.mockResolvedValue(1);
    apiMocks.prisma.conversationHandoff.findMany.mockResolvedValue([{ rating: 5 }, { rating: 4 }, { rating: 3 }]);
    apiMocks.prisma.lead.count.mockResolvedValue(2);
    apiMocks.prisma.instagramPostStats.findMany.mockResolvedValue([]);
    apiMocks.prisma.message.findMany.mockResolvedValue([
      {
        id: "inbound-1",
        direction: "INBOUND",
        fromNumber: "201144999221",
        toNumber: "15551421769",
        channel: "whatsapp",
        createdAt: new Date("2026-05-22T18:00:00.000Z"),
        connection: { id: "connection-1" },
      },
      {
        id: "outbound-1",
        direction: "OUTBOUND",
        fromNumber: "15551421769",
        toNumber: "201144999221",
        channel: "whatsapp",
        createdAt: new Date("2026-05-22T18:03:00.000Z"),
        connection: { id: "connection-1" },
      },
    ]);
  });

  it("returns tenant analytics summary for the selected range", async () => {
    const response = await GET(new Request("http://localhost/api/analytics/summary?range=7d"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.totalReplies).toBe(1);
    expect(body.data.totalConversations).toBe(1);
    expect(body.data.handoffs).toBe(1);
    expect(body.data.leadsDetected).toBe(2);
    expect(body.data.dailyReplies).toHaveLength(7);
    expect(body.data.channelSplit.whatsapp).toBe(1);
    expect(body.data.channelSplit.instagram).toBe(0);
    expect(body.data.channelSplit.messenger).toBe(0);
    expect(body.data.topInstagramPosts).toEqual([]);
    expect(body.data.averageRating).toBe(4);
    expect(body.data.ratingCount).toBe(3);
    expect(body.data.planTier).toBe("PRO");
  });
});
