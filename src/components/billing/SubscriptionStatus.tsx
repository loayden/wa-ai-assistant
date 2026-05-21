// FILE: src/components/billing/SubscriptionStatus.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Subscription state and usage sit above payment actions because
 * operators need current entitlement context before changing plans.
 */
import type { ReactNode } from "react";
import { CalendarClock, CreditCard, MessageCircle, Phone } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { UsageBar } from "@/components/dashboard/UsageBar";
import { PLAN_LIMITS, type PlanTier } from "@/types/subscription";

type SubscriptionStatusProps = {
  planTier: PlanTier;
  subscriptionStatus: "ACTIVE" | "INACTIVE" | "PAST_DUE" | "CANCELED";
  monthlyReplyCount: number;
  nextBillingDate?: string | null;
};

function getStatusVariant(status: SubscriptionStatusProps["subscriptionStatus"]) {
  if (status === "ACTIVE") {
    return "active" as const;
  }

  if (status === "PAST_DUE") {
    return "error" as const;
  }

  return "paused" as const;
}

export function SubscriptionStatus({ planTier, subscriptionStatus, monthlyReplyCount, nextBillingDate }: SubscriptionStatusProps) {
  const limits = PLAN_LIMITS[planTier];
  const remaining = Math.max(limits.includedRepliesPerMonth - monthlyReplyCount, 0);

  return (
    <Card className="overflow-hidden rounded-[22px] border-wa-gray-100 bg-white shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px]">
      <CardHeader className="border-b border-wa-gray-100 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">Current plan</p>
        <CardTitle className="mt-2 text-[24px] font-semibold sm:text-[28px]">{planTier}</CardTitle>
          </div>
          <StatusBadge className="px-3 py-1" label={subscriptionStatus.replace("_", " ")} variant={getStatusVariant(subscriptionStatus)} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:space-y-5 sm:p-6">
        <div className="grid gap-3 md:grid-cols-4">
          <StatusMetric
            icon={<MessageCircle className="size-4" aria-hidden="true" />}
            label="Replies used"
            value={`${monthlyReplyCount.toLocaleString()} / ${limits.includedRepliesPerMonth.toLocaleString()}`}
          />
          <StatusMetric
            icon={<MessageCircle className="size-4" aria-hidden="true" />}
            label="Remaining"
            value={`${remaining.toLocaleString()} included`}
          />
          <StatusMetric icon={<Phone className="size-4" aria-hidden="true" />} label="Numbers" value={`${limits.maxConnections} max`} />
          <StatusMetric
            icon={planTier === "FREE" ? <CreditCard className="size-4" aria-hidden="true" /> : <CalendarClock className="size-4" aria-hidden="true" />}
            label={planTier === "FREE" ? "Billing" : "Next billing"}
            value={planTier !== "FREE" ? nextBillingDate ?? "Managed by Paymob" : "No active period"}
          />
        </div>
        <UsageBar planTier={planTier} used={monthlyReplyCount} />
      </CardContent>
    </Card>
  );
}

function StatusMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-3 sm:p-4">
      <div className="mb-2.5 flex size-9 items-center justify-center rounded-xl bg-white text-wa-blue-600 shadow-[0_10px_28px_rgba(13,20,33,0.05)] sm:mb-3 sm:size-10 sm:rounded-2xl">
        {icon}
      </div>
      <p className="text-label font-medium uppercase tracking-widest text-wa-gray-400">{label}</p>
      <p className="mt-1 text-body-sm font-semibold text-wa-gray-900">{value}</p>
    </div>
  );
}
