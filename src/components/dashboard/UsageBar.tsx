// FILE: src/components/dashboard/UsageBar.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: FREE users need visible monthly limits, while PRO users should see
 * the same placement without an artificial cap.
 */
import { Progress } from "@/components/ui/progress";

type UsageBarProps = {
  planTier: "FREE" | "PRO";
  used: number;
};

export function UsageBar({ planTier, used }: UsageBarProps) {
  const limit = planTier === "FREE" ? 50 : null;
  const percentage = limit ? Math.min(100, Math.round((used / limit) * 100)) : 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Monthly AI replies</span>
        <span className="text-muted-foreground">{limit ? `${used}/${limit}` : `${used}/Unlimited`}</span>
      </div>
      <Progress value={percentage} />
      <p className="text-xs text-muted-foreground">
        {limit ? `${Math.max(0, limit - used)} replies remaining this month.` : "PRO includes unlimited AI replies."}
      </p>
    </div>
  );
}
