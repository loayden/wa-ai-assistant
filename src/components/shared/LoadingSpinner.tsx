// FILE: src/components/shared/LoadingSpinner.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: A single spinner primitive keeps pending button and page states
 * visually consistent without custom one-off loaders.
 */
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export function LoadingSpinner({ className }: { className?: string }) {
  return <Loader2 aria-hidden="true" className={cn("size-4 animate-spin", className)} />;
}
