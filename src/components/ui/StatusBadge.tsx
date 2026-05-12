// FILE: src/components/ui/StatusBadge.tsx

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Product-facing statuses use semantic words and restrained color,
 * avoiding raw backend state names on the primary interface.
 */
import { cn } from "@/lib/utils";

export interface StatusBadgeProps {
  label: string;
  variant: "active" | "paused" | "error" | "pro" | "free";
  className?: string;
}

const variantClasses: Record<StatusBadgeProps["variant"], string> = {
  active: "bg-wa-success-bg text-wa-success",
  paused: "bg-wa-gray-50 text-wa-gray-600",
  error: "bg-wa-error-bg text-wa-error",
  pro: "bg-wa-blue-50 text-wa-blue-800",
  free: "bg-wa-gray-50 text-wa-gray-600",
};

const dotClasses: Partial<Record<StatusBadgeProps["variant"], string>> = {
  active: "bg-wa-success animate-pulse-dot",
  paused: "bg-wa-gray-400",
  error: "bg-wa-error",
};

export function StatusBadge({ className, label, variant }: StatusBadgeProps) {
  const dotClass = dotClasses[variant];

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-label font-medium", variantClasses[variant], className)}>
      {dotClass ? <span className={cn("size-1.5 rounded-full", dotClass)} aria-hidden="true" /> : null}
      {label}
    </span>
  );
}
