import { PlanTier, SubscriptionStatus } from "@prisma/client";

export function buildExpiredTrialWhere(now = new Date()) {
  return {
    planTier: PlanTier.PRO,
    trialUsed: true,
    trialEndsAt: {
      lt: now,
    },
    paidAt: null,
  };
}

export function getExpiredTrialDowngradeData() {
  return {
    planTier: PlanTier.FREE,
    subscriptionStatus: SubscriptionStatus.INACTIVE,
    trialEndsAt: null,
    monthlyReplyCount: 0,
  };
}
