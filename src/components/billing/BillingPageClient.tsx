// FILE: src/components/billing/BillingPageClient.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Billing uses hosted Paymob checkout from the API so card data never
 * touches the application frontend.
 */
"use client";

import type { ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { LockKeyhole, ReceiptText, ShieldCheck } from "lucide-react";

import { PlanCard } from "@/components/billing/PlanCard";
import { SubscriptionStatus } from "@/components/billing/SubscriptionStatus";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubscription } from "@/hooks/useSubscription";
import { apiData } from "@/lib/api/client";
import { PLAN_LIMITS, type PlanTier } from "@/types/subscription";

type RedirectResponse = {
  url: string;
};

type PaidPlanTier = Extract<PlanTier, "PRO" | "BUSINESS">;

const planCopy: Record<
  PlanTier,
  {
    description: string;
    features: string[];
    useCase: string;
    overageLabel: string;
    recommended?: boolean;
  }
> = {
  FREE: {
    description: "For testing the assistant with a small message volume.",
    features: ["Default assistant behavior", "Basic inbox access", "Manual setup support"],
    useCase: "Best for trying kallem",
    overageLabel: "Stops at 50 replies",
  },
  PRO: {
    description: "For active small businesses that need daily AI replies.",
    features: ["Custom assistant instructions", "Multiple WhatsApp numbers", "Tracked overage after included replies"],
    useCase: "Best for growing businesses",
    overageLabel: "Overage allowed after 2,000",
    recommended: true,
  },
  BUSINESS: {
    description: "For higher-volume teams that manage more customer conversations.",
    features: ["Higher reply allowance", "More connected numbers", "Priority support and operational headroom"],
    useCase: "Best for busy teams",
    overageLabel: "Overage allowed after 10,000",
  },
};

function formatReplies(count: number) {
  return `${count.toLocaleString()} replies / month`;
}

export function BillingPageClient() {
  const subscription = useSubscription();
  const searchParams = useSearchParams();
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

  if (subscription.isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-[260px] w-full rounded-[28px]" />
        <div className="grid gap-4 xl:grid-cols-3">
          <Skeleton className="h-[560px] rounded-[28px]" />
          <Skeleton className="h-[560px] rounded-[28px]" />
          <Skeleton className="h-[560px] rounded-[28px]" />
        </div>
      </div>
    );
  }

  if (subscription.error) {
    return (
      <Alert className="border-wa-error bg-wa-error-bg">
        <AlertTitle>Billing unavailable</AlertTitle>
        <AlertDescription>{subscription.error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!subscription.user) {
    return (
      <Alert className="border-wa-error bg-wa-error-bg">
        <AlertTitle>Billing unavailable</AlertTitle>
        <AlertDescription>The settings response did not include plan data.</AlertDescription>
      </Alert>
    );
  }

  const user = subscription.user;
  const currentPlan = subscription.planTier;
  const isPaidPlan = subscription.isPaidPlan;
  const mutationError = checkoutMutation.error;
  const billingBusy = checkoutMutation.isPending;
  const checkoutStatus = searchParams.get("checkout");

  function handlePlanAction(targetPlan: PlanTier) {
    if (targetPlan === currentPlan) {
      return;
    }

    if (targetPlan === "FREE") {
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
      {checkoutStatus === "success" ? (
        <Alert className="border-wa-success/30 bg-wa-success-bg text-wa-success">
          <AlertTitle>Plan update started</AlertTitle>
          <AlertDescription>
            Paymob confirmed checkout. Your plan will update as soon as the payment webhook finishes processing.
          </AlertDescription>
        </Alert>
      ) : null}
      {checkoutStatus === "paymob-return" ? (
        <Alert className="border-wa-blue-100 bg-wa-blue-50 text-wa-blue-700">
          <AlertTitle>Payment is being confirmed</AlertTitle>
          <AlertDescription>
            Paymob sent you back to kallem. Your plan updates automatically after Paymob confirms the payment.
          </AlertDescription>
        </Alert>
      ) : null}
      {checkoutStatus === "cancelled" ? (
        <Alert className="border-wa-gray-100 bg-white text-wa-gray-700">
          <AlertTitle>Checkout was cancelled</AlertTitle>
          <AlertDescription>No billing changes were made. You can choose a plan again whenever you are ready.</AlertDescription>
        </Alert>
      ) : null}
      {mutationError ? (
        <Alert className="border-wa-error bg-wa-error-bg">
          <AlertTitle>Paymob checkout failed</AlertTitle>
          <AlertDescription>{mutationError.message}</AlertDescription>
        </Alert>
      ) : null}

      <section className="rounded-[22px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px] sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">Plans</p>
            <h2 className="mt-2 text-[24px] font-semibold leading-tight text-wa-gray-900 sm:text-[28px]">Choose how much AI should handle.</h2>
            <p className="mt-2 max-w-[640px] text-body-sm leading-6 text-wa-gray-600">
              Prices are set in EGP for Egyptian small businesses. Upgrade opens a secure Paymob checkout page, and kallem never stores card numbers.
            </p>
          </div>
          {isPaidPlan ? <p className="rounded-full border border-wa-gray-100 bg-wa-gray-50 px-4 py-2 text-body-sm font-medium text-wa-gray-600">Current plan is active</p> : null}
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          {(Object.keys(PLAN_LIMITS) as PlanTier[]).map((plan) => {
            const limits = PLAN_LIMITS[plan];
            const copy = planCopy[plan];
            const isCurrent = currentPlan === plan;
            const isPaidTarget = plan !== "FREE";
            const actionLabel = isCurrent
              ? "Current plan"
              : plan === "FREE" && isPaidPlan
                ? "Contact support"
                : isPaidTarget
                  ? isPaidPlan
                    ? `Switch to ${plan}`
                    : `Upgrade to ${plan}`
                  : "Current plan";

            return (
              <PlanCard
                key={plan}
                title={plan}
                priceLabel={limits.monthlyPriceEgp === 0 ? "EGP 0" : `EGP ${limits.monthlyPriceEgp.toLocaleString("en-US")}/mo`}
                description={`${copy.useCase}. ${copy.description}`}
                includedRepliesLabel={formatReplies(limits.includedRepliesPerMonth)}
                numberLimitLabel={`${limits.maxConnections} ${limits.maxConnections === 1 ? "number" : "numbers"}`}
                overageLabel={copy.overageLabel}
                features={copy.features}
                current={isCurrent}
                recommended={copy.recommended}
                actionLabel={billingBusy ? "Opening Paymob..." : actionLabel}
                disabled={billingBusy || (plan === "FREE" && isPaidPlan)}
                onAction={() => handlePlanAction(plan)}
              />
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <TrustCard
          icon={<ShieldCheck className="size-5" aria-hidden="true" />}
          title="Payment handled by Paymob"
          description="Card details stay on Paymob-hosted checkout. kallem only receives the payment confirmation."
        />
        <TrustCard
          icon={<ReceiptText className="size-5" aria-hidden="true" />}
          title="Overage stays visible"
          description="Paid plans keep replying after included replies and track overage so you can review usage clearly."
        />
        <TrustCard
          icon={<LockKeyhole className="size-5" aria-hidden="true" />}
          title="Plan limits are enforced"
          description="Reply limits and WhatsApp number limits are checked by the backend, not only by the UI."
        />
      </div>

      <Card className="overflow-hidden rounded-[22px] border-wa-gray-100 bg-white shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px]">
        <CardHeader className="border-b border-wa-gray-100 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">Invoices</p>
              <CardTitle className="mt-2 text-[24px] font-semibold">Billing history</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-4 sm:rounded-[22px] sm:p-5">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white text-wa-blue-600 shadow-[0_10px_28px_rgba(13,20,33,0.05)]">
                <ReceiptText className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-body-sm font-semibold text-wa-gray-900">
                  {isPaidPlan ? "Payment receipts are handled by Paymob." : "No paid receipts yet."}
                </p>
                <p className="mt-1 text-body-sm leading-6 text-wa-gray-600">
                  {isPaidPlan
                    ? "Paymob confirms payments through a secure webhook. Formal invoices can be added later if the business needs tax invoicing."
                    : "Invoices will appear after the account upgrades to a paid plan."}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TrustCard({ description, icon, title }: { description: string; icon: ReactNode; title: string }) {
  return (
    <div className="rounded-[20px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.035)] sm:rounded-[24px] sm:p-5">
      <div className="flex size-10 items-center justify-center rounded-xl bg-wa-blue-50 text-wa-blue-600 sm:size-11 sm:rounded-2xl">{icon}</div>
      <p className="mt-4 text-body-sm font-semibold text-wa-gray-900">{title}</p>
      <p className="mt-2 text-body-sm leading-6 text-wa-gray-600">{description}</p>
    </div>
  );
}
