// FILE: src/components/ui/progress.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Progress bars visualize monthly usage with stable dimensions so
 * dashboard metrics do not shift as counts change.
 */
import { cn } from "@/lib/utils";

export function Progress({ value, className }: { value: number; className?: string }) {
  const safeValue = Math.max(0, Math.min(value, 100));

  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${safeValue}%` }} />
    </div>
  );
}
