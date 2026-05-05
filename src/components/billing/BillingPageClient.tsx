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

type RedirectResponse = {
  url: string;
};

export function BillingPageClient() {
  const subscription = useSubscription();
  const checkoutMutation = useMutation({
    mutationFn: () => apiData<RedirectResponse>("/api/billing/create-checkout", { method: "POST" }),
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
  const isProPlan = subscription.isProPlan;
  const mutationError = checkoutMutation.error ?? portalMutation.error;

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
      <div className="grid gap-4 md:grid-cols-2">
        <PlanCard
          title="FREE"
          description="Test automation with one WhatsApp number."
          features={["50 AI replies/month", "1 WhatsApp number", "Default assistant prompt"]}
          current={!isProPlan}
          actionLabel="Downgrade in Portal"
          disabled={!isProPlan}
          onAction={() => portalMutation.mutate()}
        />
        <PlanCard
          title="PRO"
          description="Scale automated support with prompt control."
          features={["Unlimited AI replies", "3 WhatsApp numbers", "Custom prompt", "Priority support"]}
          current={isProPlan}
          actionLabel={checkoutMutation.isPending ? "Opening Checkout..." : "Upgrade to PRO"}
          disabled={checkoutMutation.isPending}
          onAction={() => checkoutMutation.mutate()}
        />
      </div>
      {isProPlan ? (
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
