// FILE: src/components/billing/PlanCard.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Plan cards keep feature comparison and payment action in the same
 * compact surface so the billing route remains operational, not marketing-led.
 */
import type { ReactNode } from "react";
import { Check, MessageCircle, Phone, ReceiptText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";
import type { PlanTier } from "@/types/subscription";

type PlanCardProps = {
  title: PlanTier;
  priceLabel: string;
  description: string;
  includedRepliesLabel: string;
  numberLimitLabel: string;
  overageLabel: string;
  features: string[];
  current: boolean;
  recommended?: boolean;
  actionLabel: string;
  disabled?: boolean;
  onAction: () => void;
};

const planNames: Record<PlanTier, string> = {
  FREE: "مجاني",
  PRO: "Pro",
  BUSINESS: "Business",
};

export function PlanCard({
  actionLabel,
  current,
  description,
  disabled,
  features,
  includedRepliesLabel,
  numberLimitLabel,
  onAction,
  overageLabel,
  priceLabel,
  recommended = false,
  title,
}: PlanCardProps) {
  return (
    <Card
      className={cn(
        "relative flex min-h-0 flex-col overflow-hidden rounded-[22px] border-wa-gray-100 bg-white shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:min-h-[560px] sm:rounded-[28px]",
        recommended && !current && "border-wa-blue-600 ring-4 ring-wa-blue-50",
        current && "border-wa-success/30 ring-4 ring-wa-success-bg",
      )}
    >
      {recommended ? (
        <div className="absolute right-4 top-4 rounded-full bg-wa-blue-600 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-white sm:right-5 sm:top-5 sm:px-3 sm:text-label">
          الأنسب
        </div>
      ) : null}
      <CardHeader className="gap-3 p-4 sm:gap-4 sm:p-6">
        <div className="flex min-h-8 items-center justify-between gap-3 pr-24 sm:pr-28">
          <CardTitle className="text-[22px] font-semibold">{planNames[title]}</CardTitle>
          {current ? <StatusBadge className="px-3 py-1" label="خطتك الحالية" variant="active" /> : null}
        </div>
        <div>
          <p className="text-[34px] font-semibold leading-none text-wa-gray-900 sm:text-[42px]">{priceLabel}</p>
          <p className="mt-3 text-body-sm leading-6 text-wa-gray-600">{description}</p>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 p-4 pt-0 sm:gap-5 sm:p-6 sm:pt-0">
        <div className="grid gap-3">
          <PlanMetric
            icon={<MessageCircle className="size-4" aria-hidden="true" />}
            label="الردود المتاحة"
            value={includedRepliesLabel}
          />
          <PlanMetric icon={<Phone className="size-4" aria-hidden="true" />} label="أرقام واتساب" value={numberLimitLabel} />
          <PlanMetric icon={<ReceiptText className="size-4" aria-hidden="true" />} label="بعد الحد" value={overageLabel} />
        </div>

        <div className="space-y-3">
          {features.map((feature) => (
            <p key={feature} className="flex items-start gap-2 text-body-sm leading-6 text-wa-gray-700">
              <Check className="mt-1 size-4 shrink-0 text-wa-blue-600" aria-hidden="true" />
              <span>{feature}</span>
            </p>
          ))}
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 sm:p-6 sm:pt-0">
        <Button
          className="w-full rounded-full"
          disabled={disabled || current}
          variant={current ? "secondary" : recommended ? "default" : "outline"}
          onClick={onAction}
        >
          {current ? "الخطة الحالية" : actionLabel}
        </Button>
      </CardFooter>
    </Card>
  );
}

function PlanMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-3 sm:p-4">
      <div className="mb-2 flex items-center gap-2 text-wa-blue-600">
        <span className="flex size-8 items-center justify-center rounded-xl bg-white shadow-[0_10px_28px_rgba(13,20,33,0.05)]">
          {icon}
        </span>
        <p className="text-label font-medium uppercase tracking-widest text-wa-gray-400">{label}</p>
      </div>
      <p className="text-body-sm font-semibold text-wa-gray-900">{value}</p>
    </div>
  );
}
