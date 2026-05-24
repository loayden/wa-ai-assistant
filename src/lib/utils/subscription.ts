// FILE: src/lib/utils/subscription.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: AI reply limits are enforced in one utility so webhook and manual
 * reply routes apply the same tenant-scoped subscription rules.
 */
import "server-only";

import { PlanTier } from "@prisma/client";

import { prisma } from "@/lib/prisma/client";
import { sendEmail } from "@/lib/resend/client";
import { hasCrossedUsageThreshold } from "@/lib/admin/pricing";
import { appEnv } from "@/lib/utils/env";
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
    select: { id: true },
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

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      fullName: true,
      planTier: true,
      monthlyReplyCount: true,
    },
  });

  if (!currentUser) {
    logger.warn("subscription.incrementReplyCount", "User not found while incrementing monthly count.", { userId });
    return 0;
  }

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

  await sendUsageAlertsIfNeeded({
    userId,
    email: currentUser.email,
    fullName: currentUser.fullName,
    planTier: currentUser.planTier,
    previousCount: currentUser.monthlyReplyCount,
    nextCount: user.monthlyReplyCount,
    usageAlert80SentAt: null,
    usageAlert100SentAt: null,
  });

  return user.monthlyReplyCount;
}

async function sendUsageAlertsIfNeeded({
  email,
  fullName,
  nextCount,
  planTier,
  previousCount,
  usageAlert80SentAt,
  usageAlert100SentAt,
  userId,
}: {
  userId: string;
  email: string;
  fullName: string | null;
  planTier: PlanTier;
  previousCount: number;
  nextCount: number;
  usageAlert80SentAt: Date | null;
  usageAlert100SentAt: Date | null;
}) {
  const limit = PLAN_REPLY_LIMITS[planTier].includedRepliesPerMonth;
  const billingUrl = `${appEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/billing`;
  const displayName = fullName?.trim() || "صاحب النشاط";

  try {
    if (!usageAlert80SentAt && hasCrossedUsageThreshold(previousCount, nextCount, limit, 80)) {
      await sendEmail({
        to: email,
        subject: "اقتربت من حد الردود الشهري",
        html: `
          <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.7;color:#111827">
            <p>أهلًا ${displayName}،</p>
            <p>استخدمت ${nextCount.toLocaleString("ar-EG")} من ${limit.toLocaleString("ar-EG")} رد هذا الشهر.</p>
            <p>لو متوقع رسائل أكثر، ترقية الخطة تمنع توقف الردود في وقت مهم.</p>
            <p><a href="${billingUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;border-radius:999px;padding:12px 22px;font-weight:700">ترقية الخطة</a></p>
          </div>
        `,
      });

      await markUsageAlertSent(userId, "usageAlert80SentAt");
    }

    if (
      planTier === PlanTier.FREE &&
      !usageAlert100SentAt &&
      hasCrossedUsageThreshold(previousCount, nextCount, limit, 100)
    ) {
      await sendEmail({
        to: email,
        subject: "انتهى رصيد ردودك المجانية",
        html: `
          <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.7;color:#111827">
            <p>أهلًا ${displayName}،</p>
            <p>استخدمت كامل رصيد الخطة المجانية (${limit.toLocaleString("ar-EG")} رد).</p>
            <p>الترقية إلى Pro تفتح 2,000 رد شهريًا وتمنع توقف المساعد.</p>
            <p><a href="${billingUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;border-radius:999px;padding:12px 22px;font-weight:700">ترقية الآن</a></p>
          </div>
        `,
      });

      await markUsageAlertSent(userId, "usageAlert100SentAt");
    }
  } catch (error) {
    logger.error("subscription.sendUsageAlertsIfNeeded", "Failed to send usage alert email.", { error, userId });
  }
}

async function markUsageAlertSent(userId: string, field: "usageAlert80SentAt" | "usageAlert100SentAt") {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { [field]: new Date() },
      select: { id: true },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (!/usage_alert_(80|100)_sent_at|column .* does not exist/i.test(message)) {
      throw error;
    }

    logger.warn("subscription.markUsageAlertSent", "Usage alert marker column is not available in this database yet.", {
      userId,
      field,
    });
  }
}
