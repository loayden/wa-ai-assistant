// FILE: src/components/ai/ToneSelector.tsx
"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Tone selection is a three-card control because users should not
 * parse a dropdown for the assistant's personality.
 */
import { BriefcaseBusiness, Smile, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";

export type ToneValue = "friendly" | "professional" | "sales";

export interface ToneSelectorProps {
  value: ToneValue;
  disabled?: boolean;
  onChange: (value: ToneValue) => void;
}

const options = [
  { value: "friendly", label: "Friendly", icon: Smile },
  { value: "professional", label: "Professional", icon: BriefcaseBusiness },
  { value: "sales", label: "Sales", icon: TrendingUp },
] satisfies Array<{ value: ToneValue; label: string; icon: typeof Smile }>;

export function ToneSelector({ disabled = false, onChange, value }: ToneSelectorProps) {
  return (
    <div className="grid w-full grid-cols-3 gap-2" role="radiogroup" aria-label="AI tone">
      {options.map((option) => {
        const Icon = option.icon;
        const selected = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex h-20 flex-col items-center justify-center gap-1.5 rounded-xl border text-center text-body-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-wa-blue-50 disabled:pointer-events-none disabled:opacity-50",
              selected
                ? "border-[1.5px] border-wa-blue-600 bg-wa-blue-50 text-wa-blue-800"
                : "border-wa-gray-100 bg-wa-gray-50 text-wa-gray-600 hover:border-wa-gray-200",
            )}
          >
            <Icon className={cn("size-5", selected ? "text-wa-blue-600" : "text-wa-gray-600")} aria-hidden="true" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
