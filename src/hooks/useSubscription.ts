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
  const limit = PLAN_LIMITS[planTier].maxRepliesPerMonth;
  const usagePercentage = useMemo(() => {
    if (limit === null) {
      return 100;
    }

    return Math.min(100, Math.round((usage / limit) * 100));
  }, [limit, usage]);

  return {
    planTier,
    status,
    usage,
    limit,
    isProPlan: planTier === "PRO",
    usagePercentage,
    isLoading: settingsQuery.isLoading,
    error: settingsQuery.error,
    user: settingsQuery.user,
    settings: settingsQuery.settings,
  };
}
