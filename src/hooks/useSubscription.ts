// FILE: src/hooks/useSubscription.ts
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Plan limits are derived in one hook so usage bars and upgrade gates
 * cannot drift across dashboard, settings, and billing UI.
 */
"use client";

import { useMemo } from "react";

import { useSettings } from "@/hooks/useSettings";
import { PLAN_LIMITS } from "@/types/subscription";

export function useSubscription() {
  const settingsQuery = useSettings();
  const planTier = settingsQuery.user?.planTier ?? "FREE";
  const status = settingsQuery.user?.subscriptionStatus ?? "INACTIVE";
  const usage = settingsQuery.user?.monthlyReplyCount ?? 0;
  const planLimits = PLAN_LIMITS[planTier];
  const includedReplies = planLimits.includedRepliesPerMonth;
  const remainingIncludedReplies = Math.max(includedReplies - usage, 0);
  const overageReplies = planLimits.allowsOverage ? Math.max(usage - includedReplies, 0) : 0;
  const usagePercentage = useMemo(() => {
    return Math.min(100, Math.round((Math.min(usage, includedReplies) / includedReplies) * 100));
  }, [includedReplies, usage]);

  return {
    planTier,
    status,
    usage,
    limit: includedReplies,
    includedReplies,
    remainingIncludedReplies,
    overageReplies,
    maxConnections: planLimits.maxConnections,
    canUseCustomPrompt: planLimits.allowsCustomPrompt,
    allowsOverage: planLimits.allowsOverage,
    isPaidPlan: planTier !== "FREE",
    isProPlan: planTier === "PRO",
    isBusinessPlan: planTier === "BUSINESS",
    usagePercentage,
    isLoading: settingsQuery.isLoading,
    error: settingsQuery.error,
    user: settingsQuery.user,
    settings: settingsQuery.settings,
  };
}
