// FILE: src/app/(dashboard)/billing/page.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Billing renders as a subscription control page, with Stripe-hosted
 * checkout and portal actions delegated to Phase 7 API routes.
 */
import { BillingPageClient } from "@/components/billing/BillingPageClient";

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Billing</h1>
        <p className="text-sm text-muted-foreground">Review usage, switch between FREE, PRO, and BUSINESS, or manage subscription details in Stripe.</p>
      </div>
      <BillingPageClient />
    </div>
  );
}
