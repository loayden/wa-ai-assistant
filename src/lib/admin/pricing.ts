import { PlanTier } from "@prisma/client";

export const ADMIN_PLAN_PRICES_EGP: Record<PlanTier, number> = {
  [PlanTier.FREE]: 0,
  [PlanTier.PRO]: 999,
  [PlanTier.BUSINESS]: 2499,
};

export const ADMIN_PLAN_REPLY_LIMITS: Record<PlanTier, number> = {
  [PlanTier.FREE]: 50,
  [PlanTier.PRO]: 2000,
  [PlanTier.BUSINESS]: 10000,
};

export function calculateMrrEgp(planCounts: Partial<Record<PlanTier, number>>): number {
  return Object.values(PlanTier).reduce((total, plan) => {
    return total + (planCounts[plan] ?? 0) * ADMIN_PLAN_PRICES_EGP[plan];
  }, 0);
}

export function getUsagePercent(used: number, limit: number): number {
  if (limit <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((Math.max(used, 0) / limit) * 100));
}

export function hasCrossedUsageThreshold(previousCount: number, nextCount: number, limit: number, thresholdPercent: number): boolean {
  if (limit <= 0) {
    return false;
  }

  const thresholdCount = Math.ceil(limit * (thresholdPercent / 100));
  return previousCount < thresholdCount && nextCount >= thresholdCount;
}

export function getTrialDaysRemaining(trialEndsAt: Date | string | null | undefined, now = new Date()): number | null {
  if (!trialEndsAt) {
    return null;
  }

  const end = trialEndsAt instanceof Date ? trialEndsAt : new Date(trialEndsAt);
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) {
    return 0;
  }

  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

export function isTrialActive(trialEndsAt: Date | string | null | undefined, now = new Date()): boolean {
  const days = getTrialDaysRemaining(trialEndsAt, now);
  return days !== null && days > 0;
}
