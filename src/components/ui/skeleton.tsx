// FILE: src/components/ui/skeleton.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Skeleton keeps loading states consistent across data-heavy pages.
 */
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}
