// FILE: src/types/subscription.ts
/*
 * [ROLE: BACKEND ENGINEER + FRONTEND ENGINEER]
 * Decision: Subscription limits are centralized so backend checks and frontend
 * usage meters share the same FREE and PRO entitlement contract.
 */
export type PlanTier = "FREE" | "PRO";

export type SubscriptionStatus = "ACTIVE" | "INACTIVE" | "PAST_DUE" | "CANCELED";

export type PlanLimits = {
  maxRepliesPerMonth: number | null;
  maxConnections: number;
};

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  FREE: {
    maxRepliesPerMonth: 50,
    maxConnections: 1,
  },
  PRO: {
    maxRepliesPerMonth: null,
    maxConnections: 3,
  },
};
