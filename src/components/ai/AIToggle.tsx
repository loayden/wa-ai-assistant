// FILE: src/components/ai/AIToggle.tsx
"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: The AI toggle is the product's hero control, so it performs an
 * optimistic settings update directly and reverts on API failure.
 */
import { useEffect, useState } from "react";

import { useUpdateSettings } from "@/hooks/useSettings";
import { cn } from "@/lib/utils";

export interface AIToggleProps {
  enabled: boolean;
  disabled?: boolean;
  className?: string;
  onOptimisticChange?: (enabled: boolean) => void;
}

export function AIToggle({ className, disabled = false, enabled, onOptimisticChange }: AIToggleProps) {
  const [localEnabled, setLocalEnabled] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const updateSettings = useUpdateSettings();

  useEffect(() => {
    setLocalEnabled(enabled);
  }, [enabled]);

  function handleToggle() {
    const next = !localEnabled;
    const previous = localEnabled;
    setError(null);
    setLocalEnabled(next);
    onOptimisticChange?.(next);

    updateSettings.mutate(
      { autoReplyEnabled: next },
      {
        onError: (mutationError) => {
          setLocalEnabled(previous);
          onOptimisticChange?.(previous);
          setError(mutationError instanceof Error ? mutationError.message : "تعذر تحديث حالة المساعد.");
        },
      },
    );
  }

  const loading = updateSettings.isPending;

  return (
    <section className={cn("w-full rounded-2xl border border-wa-gray-100 bg-white p-4 text-center sm:p-5", className)}>
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-wa-gray-400 sm:mb-4 sm:text-label">مساعدك الذكي</p>
      <button
        type="button"
        aria-label={localEnabled ? "إيقاف ردود المساعد" : "تشغيل ردود المساعد"}
        aria-pressed={localEnabled}
        disabled={disabled || loading}
        onClick={handleToggle}
        className={cn(
          "relative mx-auto flex h-10 w-[72px] items-center rounded-full transition-colors duration-250 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-wa-blue-50 disabled:pointer-events-none sm:h-11 sm:w-20",
          localEnabled ? "bg-wa-blue-600" : "bg-wa-gray-200",
          loading && "animate-pulse",
        )}
      >
        {localEnabled ? <span className="absolute inset-0 animate-ring-pulse rounded-full ring-4 ring-wa-blue-50" aria-hidden="true" /> : null}
        <span
          className={cn(
            "relative z-10 size-[34px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.15)] transition-transform duration-250 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] sm:size-[38px]",
            localEnabled ? "translate-x-[35px] sm:translate-x-[39px]" : "translate-x-[3px]",
            loading && "opacity-60",
          )}
          aria-hidden="true"
        />
      </button>
      <p className={cn("mt-3 text-body-sm transition duration-200 sm:mt-4", localEnabled ? "font-medium text-wa-success" : "text-wa-gray-400")}>
        {localEnabled ? "يرد على العملاء" : "متوقف"}
      </p>
      {error ? <p className="mt-3 rounded-lg bg-wa-error-bg px-3 py-2 text-body-sm text-wa-error">{error}</p> : null}
    </section>
  );
}
