// FILE: src/components/elder/ElderModeToggle.tsx
"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Elder mode uses a minimal switch-shaped control so accessibility
 * can be changed without leaving the drawer.
 */
import { cn } from "@/lib/utils";

export interface ElderModeToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

export function ElderModeToggle({ enabled, onToggle }: ElderModeToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label="Toggle large text mode"
      onClick={onToggle}
      className={cn(
        "relative h-10 w-[72px] rounded-full transition-colors duration-250 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-wa-blue-50",
        enabled ? "bg-wa-blue-600" : "bg-wa-gray-200",
      )}
    >
      <span
        className={cn(
          "absolute top-[3px] size-[34px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.15)] transition-transform duration-250 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          enabled ? "translate-x-[35px]" : "translate-x-[3px]",
        )}
        aria-hidden="true"
      />
    </button>
  );
}
