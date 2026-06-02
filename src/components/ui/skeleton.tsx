// FILE: src/components/ui/skeleton.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Skeleton keeps loading states consistent across data-heavy pages.
 */
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent",
        className,
      )}
    />
  );
}
