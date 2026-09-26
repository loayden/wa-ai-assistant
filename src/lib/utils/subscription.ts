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

export type SubscriptionClaimResult = SubscriptionLimitResult & {
  claimed: boolean;
  monthlyReplyCount: number;
};

function getCurrentUtcMonthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function buildLimitResult(planTier: PlanTier, monthlyReplyCount: number): SubscriptionLimitResult {
  const limitConfig = PLAN_REPLY_LIMITS[planTier];
  const remaining = Math.max(limitConfig.includedRepliesPerMonth - monthlyReplyCount, 0);
  const overageCount = limitConfig.allowsOverage ? Math.max(monthlyReplyCount - limitConfig.includedRepliesPerMonth, 0) : 0;

  return {
    allowed: limitConfig.allowsOverage ? true : remaining > 0,
    remaining,
    includedRepliesPerMonth: limitConfig.includedRepliesPerMonth,
    overageCount,
    allowsOverage: limitConfig.allowsOverage,
    planTier,
  };
}

function emptyLimitResult(): SubscriptionLimitResult {
  return {
    allowed: false,
    remaining: 0,
    includedRepliesPerMonth: 0,
    overageCount: 0,
    allowsOverage: false,
    planTier: PlanTier.FREE,
  };
}

export async function resetMonthlyCountIfNeeded(userId: string): Promise<void> {
  try {
    const result = await prisma.user.updateMany({
      where: {
        id: userId,
        replyCountResetAt: {
          lt: getCurrentUtcMonthStart(),
        },
      },
      data: {
        monthlyReplyCount: 0,
        replyCountResetAt: new Date(),
        usageAlert80SentAt: null,
        usageAlert100SentAt: null,
      },
    });

    if (result.count > 0) {
      logger.info("subscription.resetMonthlyCountIfNeeded", "Monthly AI reply count reset.", { userId });
    }
  } catch (error) {
    // If the columns don't exist yet, catch the error and fallback to simple reset
    const message = error instanceof Error ? error.message : String(error);
    if (/column .* does not exist/i.test(message)) {
      const fallbackResult = await prisma.user.updateMany({
        where: {
          id: userId,
          replyCountResetAt: {
            lt: getCurrentUtcMonthStart(),
          },
        },
        data: {
          monthlyReplyCount: 0,
          replyCountResetAt: new Date(),
        },
      });
      if (fallbackResult.count > 0) {
        logger.info("subscription.resetMonthlyCountIfNeeded", "Monthly AI reply count reset (fallback).", { userId });
      }
    } else {
      throw error;
    }
  }
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
    return emptyLimitResult();
  }

  return buildLimitResult(user.planTier, user.monthlyReplyCount);
}

export async function claimSubscriptionReply(userId: string): Promise<SubscriptionClaimResult> {
  await resetMonthlyCountIfNeeded(userId);

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      fullName: true,
      planTier: true,
      monthlyReplyCount: true,
      usageAlert80SentAt: true,
      usageAlert100SentAt: true,
    },
  });

  if (!currentUser) {
    logger.warn("subscription.claimSubscriptionReply", "User not found while claiming monthly reply quota.", { userId });
    return {
      ...emptyLimitResult(),
      claimed: false,
      monthlyReplyCount: 0,
    };
  }

  const limitConfig = PLAN_REPLY_LIMITS[currentUser.planTier];
  const currentLimit = buildLimitResult(currentUser.planTier, currentUser.monthlyReplyCount);

  if (!currentLimit.allowed) {
    return {
      ...currentLimit,
      claimed: false,
      monthlyReplyCount: currentUser.monthlyReplyCount,
    };
  }

  let nextCount: number;

  if (limitConfig.allowsOverage) {
    const updatedUser = await prisma.user.update({
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
    nextCount = updatedUser.monthlyReplyCount;
  } else {
    const claim = await prisma.user.updateMany({
      where: {
        id: userId,
        monthlyReplyCount: {
          lt: limitConfig.includedRepliesPerMonth,
        },
      },
      data: {
        monthlyReplyCount: {
          increment: 1,
        },
      },
    });

    if (claim.count === 0) {
      const latestUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          planTier: true,
          monthlyReplyCount: true,
        },
      });
      const latestLimit = latestUser ? buildLimitResult(latestUser.planTier, latestUser.monthlyReplyCount) : emptyLimitResult();

      return {
        ...latestLimit,
        claimed: false,
        monthlyReplyCount: latestUser?.monthlyReplyCount ?? currentUser.monthlyReplyCount,
      };
    }

    nextCount = currentUser.monthlyReplyCount + 1;
  }

  logger.info("subscription.claimSubscriptionReply", "Claimed monthly AI reply quota.", {
    userId,
    monthlyReplyCount: nextCount,
  });

  await sendUsageAlertsIfNeeded({
    userId,
    email: currentUser.email,
    fullName: currentUser.fullName,
    planTier: currentUser.planTier,
    previousCount: currentUser.monthlyReplyCount,
    nextCount,
    usageAlert80SentAt: currentUser.usageAlert80SentAt,
    usageAlert100SentAt: currentUser.usageAlert100SentAt,
  });

  return {
    ...buildLimitResult(currentUser.planTier, nextCount),
    claimed: true,
    monthlyReplyCount: nextCount,
  };
}

export async function incrementReplyCount(userId: string): Promise<number> {
  const claim = await claimSubscriptionReply(userId);
  return claim.monthlyReplyCount;
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
