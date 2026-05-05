// FILE: src/lib/utils/subscription.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: AI reply limits are enforced in one utility so webhook and manual
 * reply routes apply the same tenant-scoped subscription rules.
 */
import "server-only";

import { PlanTier } from "@prisma/client";

import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/utils/logger";

export const FREE_MONTHLY_AI_REPLY_LIMIT = 50;

export type SubscriptionLimitResult = {
  allowed: boolean;
  remaining: number | null;
};

function getCurrentUtcMonthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function isBeforeCurrentUtcMonth(date: Date): boolean {
  return date.getTime() < getCurrentUtcMonthStart().getTime();
}

export async function resetMonthlyCountIfNeeded(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, replyCountResetAt: true },
  });

  if (!user) {
    logger.warn("subscription.resetMonthlyCountIfNeeded", "User not found while resetting monthly count.", { userId });
    return;
  }

  if (!isBeforeCurrentUtcMonth(user.replyCountResetAt)) {
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      monthlyReplyCount: 0,
      replyCountResetAt: new Date(),
    },
  });

  logger.info("subscription.resetMonthlyCountIfNeeded", "Monthly AI reply count reset.", { userId });
}

export async function checkSubscriptionLimit(userId: string): Promise<SubscriptionLimitResult> {
  await resetMonthlyCountIfNeeded(userId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      planTier: true,
      monthlyReplyCount: true,
    },
  });

  if (!user) {
    logger.warn("subscription.checkSubscriptionLimit", "User not found during subscription limit check.", { userId });
    return { allowed: false, remaining: 0 };
  }

  if (user.planTier === PlanTier.PRO) {
    return { allowed: true, remaining: null };
  }

  const remaining = Math.max(FREE_MONTHLY_AI_REPLY_LIMIT - user.monthlyReplyCount, 0);

  return {
    allowed: remaining > 0,
    remaining,
  };
}

export async function incrementReplyCount(userId: string): Promise<number> {
  await resetMonthlyCountIfNeeded(userId);

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      monthlyReplyCount: {
        increment: 1,
      },
    },
    select: {
      monthlyReplyCount: true,
    },
  });

  logger.info("subscription.incrementReplyCount", "Incremented monthly AI reply count.", {
    userId,
    monthlyReplyCount: user.monthlyReplyCount,
  });

  return user.monthlyReplyCount;
}
