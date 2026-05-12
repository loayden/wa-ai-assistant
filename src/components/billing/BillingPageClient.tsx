// FILE: src/components/billing/BillingPageClient.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Billing uses hosted Stripe sessions from the API so card data never
 * touches the application frontend.
 */
"use client";

import { useMutation } from "@tanstack/react-query";

import { PlanCard } from "@/components/billing/PlanCard";
import { SubscriptionStatus } from "@/components/billing/SubscriptionStatus";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSubscription } from "@/hooks/useSubscription";
import { apiData } from "@/lib/api/client";
import type { PlanTier } from "@/types/subscription";

type RedirectResponse = {
  url: string;
};

type PaidPlanTier = Extract<PlanTier, "PRO" | "BUSINESS">;

export function BillingPageClient() {
  const subscription = useSubscription();
  const checkoutMutation = useMutation({
    mutationFn: (planTier: PaidPlanTier) =>
      apiData<RedirectResponse>("/api/billing/create-checkout", {
        method: "POST",
        body: JSON.stringify({ planTier }),
      }),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });
  const portalMutation = useMutation({
    mutationFn: () => apiData<RedirectResponse>("/api/billing/portal"),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });

  if (subscription.isLoading) {
    return <Skeleton className="h-[520px] w-full" />;
  }

  if (subscription.error) {
    return (
      <Alert>
        <AlertTitle>Billing unavailable</AlertTitle>
        <AlertDescription>{subscription.error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!subscription.user) {
    return (
      <Alert>
        <AlertTitle>Billing unavailable</AlertTitle>
        <AlertDescription>The settings response did not include plan data.</AlertDescription>
      </Alert>
    );
  }

  const user = subscription.user;
  const currentPlan = subscription.planTier;
  const isPaidPlan = subscription.isPaidPlan;
  const mutationError = checkoutMutation.error ?? portalMutation.error;

  function handlePlanAction(targetPlan: PlanTier) {
    if (targetPlan === "FREE" || isPaidPlan) {
      portalMutation.mutate();
      return;
    }

    checkoutMutation.mutate(targetPlan);
  }

  return (
    <div className="space-y-6">
      <SubscriptionStatus
        planTier={user.planTier}
        subscriptionStatus={user.subscriptionStatus}
        monthlyReplyCount={user.monthlyReplyCount}
      />
      {mutationError ? (
        <Alert>
          <AlertTitle>Stripe redirect failed</AlertTitle>
          <AlertDescription>{mutationError.message}</AlertDescription>
        </Alert>
      ) : null}
      <Alert>
        <AlertTitle>Included replies by plan</AlertTitle>
        <AlertDescription>FREE stops at 50 replies. PRO includes 2,000 replies and BUSINESS includes 10,000 replies before overage tracking begins.</AlertDescription>
      </Alert>
      <div className="grid gap-4 xl:grid-cols-3">
        <PlanCard
          title="FREE"
          priceLabel="$0/month"
          description="Start automation with one WhatsApp number."
          features={["50 AI replies/month", "1 WhatsApp number", "Default assistant prompt"]}
          current={currentPlan === "FREE"}
          actionLabel={portalMutation.isPending ? "Opening Portal..." : "Manage in Portal"}
          disabled={portalMutation.isPending}
          onAction={() => handlePlanAction("FREE")}
        />
        <PlanCard
          title="PRO"
          priceLabel="$19/month"
          description="Grow support volume with included replies and tracked overage."
          features={["2,000 included AI replies/month", "3 WhatsApp numbers", "Custom prompt", "Priority support", "Tracked overage after included replies"]}
          current={currentPlan === "PRO"}
          actionLabel={checkoutMutation.isPending ? "Opening Checkout..." : "Upgrade to PRO"}
          disabled={checkoutMutation.isPending}
          onAction={() => handlePlanAction("PRO")}
        />
        <PlanCard
          title="BUSINESS"
          priceLabel="$49/month"
          description="Higher reply volume, more numbers, and tracked overage after the included allowance."
          features={["10,000 included AI replies/month", "10 WhatsApp numbers", "Custom prompt", "Priority support", "Tracked overage after included replies"]}
          current={currentPlan === "BUSINESS"}
          actionLabel={checkoutMutation.isPending ? "Opening Checkout..." : "Upgrade to BUSINESS"}
          disabled={checkoutMutation.isPending}
          onAction={() => handlePlanAction("BUSINESS")}
        />
      </div>
      {isPaidPlan ? (
        <Button disabled={portalMutation.isPending} onClick={() => portalMutation.mutate()}>
          {portalMutation.isPending ? "Opening Portal..." : "Manage Subscription"}
        </Button>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
        </CardHeader>
        <CardContent>
          {/* [PLACEHOLDER - REASON: Stripe invoice listing is scheduled for v2.] */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Invoice history will appear here after the v2 Stripe invoice endpoint is added.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
