// FILE: src/components/billing/SubscriptionStatus.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Subscription state and usage sit above payment actions because
 * operators need current entitlement context before changing plans.
 */
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsageBar } from "@/components/dashboard/UsageBar";

type SubscriptionStatusProps = {
  planTier: "FREE" | "PRO";
  subscriptionStatus: "ACTIVE" | "INACTIVE" | "PAST_DUE" | "CANCELED";
  monthlyReplyCount: number;
  nextBillingDate?: string | null;
};

function getStatusVariant(status: SubscriptionStatusProps["subscriptionStatus"]) {
  if (status === "ACTIVE") {
    return "success" as const;
  }

  if (status === "PAST_DUE") {
    return "destructive" as const;
  }

  return "secondary" as const;
}

export function SubscriptionStatus({ planTier, subscriptionStatus, monthlyReplyCount, nextBillingDate }: SubscriptionStatusProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Plan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Plan</p>
            <p className="mt-1 text-2xl font-semibold">{planTier}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Status</p>
            <Badge className="mt-2" variant={getStatusVariant(subscriptionStatus)}>
              {subscriptionStatus}
            </Badge>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Next billing date</p>
            <p className="mt-2 text-sm">{planTier === "PRO" ? nextBillingDate ?? "Available in Stripe Portal" : "No active billing period"}</p>
          </div>
        </div>
        <UsageBar planTier={planTier} used={monthlyReplyCount} />
      </CardContent>
    </Card>
  );
}
