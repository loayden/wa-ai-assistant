// FILE: tests/unit/subscription.test.ts
/*
 * [ROLE: QA ENGINEER]
 * Decision: Subscription tests mock Prisma so monthly limits can be validated
 * without a live Supabase Postgres database.
 */
import { PlanTier } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma/client", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/resend/client", () => ({
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { checkSubscriptionLimit, claimSubscriptionReply, incrementReplyCount, resetMonthlyCountIfNeeded } from "@/lib/utils/subscription";

const USER_ID = "00000000-0000-0000-0000-000000000001";

describe("subscription utilities", () => {
  beforeEach(() => {
    prismaMock.user.findUnique.mockReset();
    prismaMock.user.update.mockReset();
    prismaMock.user.updateMany.mockReset();
    prismaMock.user.updateMany.mockResolvedValue({ count: 0 });
  });

  it.each([
    { count: 0, allowed: true, remaining: 50, overageCount: 0 },
    { count: 49, allowed: true, remaining: 1, overageCount: 0 },
    { count: 50, allowed: false, remaining: 0, overageCount: 0 },
  ])("checks FREE limit at $count replies", async ({ count, allowed, remaining, overageCount }) => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ planTier: PlanTier.FREE, monthlyReplyCount: count });

    await expect(checkSubscriptionLimit(USER_ID)).resolves.toEqual({
      allowed,
      remaining,
      includedRepliesPerMonth: 50,
      overageCount,
      allowsOverage: false,
      planTier: PlanTier.FREE,
    });
  });

  it("allows PRO users through the included 2,000 replies", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ planTier: PlanTier.PRO, monthlyReplyCount: 500 });

    await expect(checkSubscriptionLimit(USER_ID)).resolves.toEqual({
      allowed: true,
      remaining: 1500,
      includedRepliesPerMonth: 2000,
      overageCount: 0,
      allowsOverage: true,
      planTier: PlanTier.PRO,
    });
  });

  it("tracks PRO overage instead of blocking after 2,000 replies", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ planTier: PlanTier.PRO, monthlyReplyCount: 2250 });

    await expect(checkSubscriptionLimit(USER_ID)).resolves.toEqual({
      allowed: true,
      remaining: 0,
      includedRepliesPerMonth: 2000,
      overageCount: 250,
      allowsOverage: true,
      planTier: PlanTier.PRO,
    });
  });

  it("tracks BUSINESS overage instead of blocking after 10,000 replies", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ planTier: PlanTier.BUSINESS, monthlyReplyCount: 10025 });

    await expect(checkSubscriptionLimit(USER_ID)).resolves.toEqual({
      allowed: true,
      remaining: 0,
      includedRepliesPerMonth: 10000,
      overageCount: 25,
      allowsOverage: true,
      planTier: PlanTier.BUSINESS,
    });
  });

  it("increments the monthly reply count", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      email: "owner@example.com",
      fullName: "Owner",
      monthlyReplyCount: 11,
      planTier: PlanTier.PRO,
      usageAlert80SentAt: new Date(),
      usageAlert100SentAt: null,
    });
    prismaMock.user.update.mockResolvedValueOnce({ monthlyReplyCount: 12 });

    await expect(incrementReplyCount(USER_ID)).resolves.toBe(12);
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { monthlyReplyCount: { increment: 1 } },
      select: { monthlyReplyCount: true },
    });
  });

  it("does not reset counts within the same UTC month", async () => {
    await resetMonthlyCountIfNeeded(USER_ID);

    expect(prismaMock.user.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: USER_ID,
          replyCountResetAt: {
            lt: expect.any(Date),
          },
        },
      }),
    );
  });

  it("resets counts when the reset timestamp is from a previous UTC month", async () => {
    prismaMock.user.updateMany.mockResolvedValueOnce({ count: 1 });

    await resetMonthlyCountIfNeeded(USER_ID);

    expect(prismaMock.user.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: USER_ID }),
        data: expect.objectContaining({
          monthlyReplyCount: 0,
          replyCountResetAt: expect.any(Date),
        }),
      }),
    );
  });

  it("atomically claims the final FREE reply slot", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      email: "owner@example.com",
      fullName: "Owner",
      monthlyReplyCount: 49,
      planTier: PlanTier.FREE,
      usageAlert80SentAt: new Date(),
      usageAlert100SentAt: null,
    });
    prismaMock.user.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });

    await expect(claimSubscriptionReply(USER_ID)).resolves.toEqual({
      allowed: false,
      remaining: 0,
      includedRepliesPerMonth: 50,
      overageCount: 0,
      allowsOverage: false,
      planTier: PlanTier.FREE,
      claimed: true,
      monthlyReplyCount: 50,
    });
    expect(prismaMock.user.updateMany).toHaveBeenLastCalledWith({
      where: {
        id: USER_ID,
        monthlyReplyCount: {
          lt: 50,
        },
      },
      data: {
        monthlyReplyCount: {
          increment: 1,
        },
      },
    });
  });

  it("does not claim a FREE reply when another concurrent request used the final slot", async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce({
        email: "owner@example.com",
        fullName: "Owner",
        monthlyReplyCount: 49,
        planTier: PlanTier.FREE,
        usageAlert80SentAt: new Date(),
        usageAlert100SentAt: null,
      })
      .mockResolvedValueOnce({
        planTier: PlanTier.FREE,
        monthlyReplyCount: 50,
      });
    prismaMock.user.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 0 });

    await expect(claimSubscriptionReply(USER_ID)).resolves.toEqual({
      allowed: false,
      remaining: 0,
      includedRepliesPerMonth: 50,
      overageCount: 0,
      allowsOverage: false,
      planTier: PlanTier.FREE,
      claimed: false,
      monthlyReplyCount: 50,
    });
  });
});
