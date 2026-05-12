// FILE: src/types/subscription.ts
/*
 * [ROLE: BACKEND ENGINEER + FRONTEND ENGINEER]
 * Decision: Subscription limits are centralized so backend checks and frontend
 * usage meters share the same FREE, PRO, and BUSINESS entitlement contract.
 */
export type PlanTier = "FREE" | "PRO" | "BUSINESS";

export type SubscriptionStatus = "ACTIVE" | "INACTIVE" | "PAST_DUE" | "CANCELED";

export type PlanLimits = {
  includedRepliesPerMonth: number;
  maxConnections: number;
  allowsCustomPrompt: boolean;
  allowsOverage: boolean;
  monthlyPriceUsd: number;
};

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  FREE: {
    includedRepliesPerMonth: 50,
    maxConnections: 1,
    allowsCustomPrompt: false,
    allowsOverage: false,
    monthlyPriceUsd: 0,
  },
  PRO: {
    includedRepliesPerMonth: 2000,
    maxConnections: 3,
    allowsCustomPrompt: true,
    allowsOverage: true,
    monthlyPriceUsd: 19,
  },
  BUSINESS: {
    includedRepliesPerMonth: 10000,
    maxConnections: 10,
    allowsCustomPrompt: true,
    allowsOverage: true,
    monthlyPriceUsd: 49,
  },
};

export const PAID_PLAN_TIERS: PlanTier[] = ["PRO", "BUSINESS"];
