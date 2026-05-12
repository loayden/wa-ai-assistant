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

const PLAN_REPLY_LIMITS: Record<PlanTier, { includedRepliesPerMonth: number; allowsOverage: boolean }> = {
  [PlanTier.FREE]: {
    includedRepliesPerMonth: 50,
    allowsOverage: false,
  },
  [PlanTier.PRO]: {
    includedRepliesPerMonth: 2000,
    allowsOverage: true,
  },
  [PlanTier.BUSINESS]: {
    includedRepliesPerMonth: 10000,
    allowsOverage: true,
  },
};

export type SubscriptionLimitResult = {
  allowed: boolean;
  remaining: number;
  includedRepliesPerMonth: number;
  overageCount: number;
  allowsOverage: boolean;
  planTier: PlanTier;
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
    return {
      allowed: false,
      remaining: 0,
      includedRepliesPerMonth: 0,
      overageCount: 0,
      allowsOverage: false,
      planTier: PlanTier.FREE,
    };
  }

  const limitConfig = PLAN_REPLY_LIMITS[user.planTier];
  const remaining = Math.max(limitConfig.includedRepliesPerMonth - user.monthlyReplyCount, 0);
  const overageCount = limitConfig.allowsOverage ? Math.max(user.monthlyReplyCount - limitConfig.includedRepliesPerMonth, 0) : 0;

  return {
    allowed: limitConfig.allowsOverage ? true : remaining > 0,
    remaining,
    includedRepliesPerMonth: limitConfig.includedRepliesPerMonth,
    overageCount,
    allowsOverage: limitConfig.allowsOverage,
    planTier: user.planTier,
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
