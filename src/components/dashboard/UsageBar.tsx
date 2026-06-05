// FILE: src/components/dashboard/UsageBar.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: All plans show included monthly reply usage in the same component,
 * while paid tiers also surface overage once they move past the included cap.
 */
import { Progress } from "@/components/ui/progress";
import { formatStableNumber } from "@/lib/utils/format";
import { PLAN_LIMITS, type PlanTier } from "@/types/subscription";

type UsageBarProps = {
  planTier: PlanTier;
  used: number;
};

export function UsageBar({ planTier, used }: UsageBarProps) {
  const planLimits = PLAN_LIMITS[planTier];
  const includedReplies = planLimits.includedRepliesPerMonth;
  const percentage = Math.min(100, Math.round((Math.min(used, includedReplies) / includedReplies) * 100));
  const remainingIncludedReplies = Math.max(includedReplies - used, 0);
  const overageReplies = planLimits.allowsOverage ? Math.max(used - includedReplies, 0) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">الردود هذا الشهر</span>
        <span className="text-muted-foreground">{`${formatStableNumber(used)} / ${formatStableNumber(includedReplies)} ضمن الخطة`}</span>
      </div>
      <Progress value={percentage} />
      <p className="text-xs text-muted-foreground">
        {overageReplies > 0
          ? `${formatStableNumber(overageReplies)} رد إضافي هذا الشهر.`
          : planLimits.allowsOverage
            ? `${formatStableNumber(remainingIncludedReplies)} رد ضمن الخطة قبل احتساب الردود الإضافية.`
            : `${formatStableNumber(remainingIncludedReplies)} رد متبقٍ هذا الشهر.`}
      </p>
    </div>
  );
}
