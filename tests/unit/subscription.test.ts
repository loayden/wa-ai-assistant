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
  },
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

import { checkSubscriptionLimit, incrementReplyCount, resetMonthlyCountIfNeeded } from "@/lib/utils/subscription";

const USER_ID = "00000000-0000-0000-0000-000000000001";

function currentMonthDate() {
  const now = new Date();

  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 2));
}

function previousMonthDate() {
  const now = new Date();

  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 2));
}

describe("subscription utilities", () => {
  beforeEach(() => {
    prismaMock.user.findUnique.mockReset();
    prismaMock.user.update.mockReset();
  });

  it.each([
    { count: 0, allowed: true, remaining: 50 },
    { count: 49, allowed: true, remaining: 1 },
    { count: 50, allowed: false, remaining: 0 },
  ])("checks FREE limit at $count replies", async ({ count, allowed, remaining }) => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce({ id: USER_ID, replyCountResetAt: currentMonthDate() })
      .mockResolvedValueOnce({ planTier: PlanTier.FREE, monthlyReplyCount: count });

    await expect(checkSubscriptionLimit(USER_ID)).resolves.toEqual({ allowed, remaining });
  });

  it("allows PRO users without a remaining cap", async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce({ id: USER_ID, replyCountResetAt: currentMonthDate() })
      .mockResolvedValueOnce({ planTier: PlanTier.PRO, monthlyReplyCount: 500 });

    await expect(checkSubscriptionLimit(USER_ID)).resolves.toEqual({ allowed: true, remaining: null });
  });

  it("increments the monthly reply count", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: USER_ID, replyCountResetAt: currentMonthDate() });
    prismaMock.user.update.mockResolvedValueOnce({ monthlyReplyCount: 12 });

    await expect(incrementReplyCount(USER_ID)).resolves.toBe(12);
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { monthlyReplyCount: { increment: 1 } },
      select: { monthlyReplyCount: true },
    });
  });

  it("does not reset counts within the same UTC month", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: USER_ID, replyCountResetAt: currentMonthDate() });

    await resetMonthlyCountIfNeeded(USER_ID);

    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("resets counts when the reset timestamp is from a previous UTC month", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: USER_ID, replyCountResetAt: previousMonthDate() });

    await resetMonthlyCountIfNeeded(USER_ID);

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: {
        monthlyReplyCount: 0,
        replyCountResetAt: expect.any(Date),
      },
    });
  });
});
