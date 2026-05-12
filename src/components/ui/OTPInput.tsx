// FILE: src/components/ui/OTPInput.tsx
"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: OTP entry is split into six stable cells so mobile users can verify
 * quickly with auto-advance, paste support, and keyboard backtracking.
 */
import { useMemo, useRef } from "react";

import { cn } from "@/lib/utils";

export interface OTPInputProps {
  value: string;
  error?: string | null;
  disabled?: boolean;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
}

const OTP_LENGTH = 6;

function digitsOnly(value: string) {
  return value.replace(/\D/g, "").slice(0, OTP_LENGTH);
}

export function OTPInput({ disabled = false, error, onChange, onComplete, value }: OTPInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const cells = useMemo(() => Array.from({ length: OTP_LENGTH }, (_, index) => value[index] ?? ""), [value]);

  function commit(nextValue: string) {
    const normalized = digitsOnly(nextValue);
    onChange(normalized);

    if (normalized.length === OTP_LENGTH) {
      onComplete?.(normalized);
    }
  }

  function focusCell(index: number) {
    inputRefs.current[Math.max(0, Math.min(index, OTP_LENGTH - 1))]?.focus();
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-center gap-2" role="group" aria-label="Verification code">
        {cells.map((digit, index) => (
          <input
            key={index}
            ref={(node) => {
              inputRefs.current[index] = node;
            }}
            aria-label={`Verification digit ${index + 1}`}
            disabled={disabled}
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(event) => {
              const nextDigit = digitsOnly(event.target.value).slice(-1);
              const next = `${value.slice(0, index)}${nextDigit}${value.slice(index + 1)}`.slice(0, OTP_LENGTH);
              commit(next);
              if (nextDigit) {
                focusCell(index + 1);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Backspace" && !digit) {
                focusCell(index - 1);
              }
            }}
            onPaste={(event) => {
              event.preventDefault();
              commit(digitsOnly(event.clipboardData.getData("text")));
              focusCell(OTP_LENGTH - 1);
            }}
            className={cn(
              "h-14 w-12 rounded-xl border border-wa-gray-100 bg-wa-gray-50 text-center text-h2 font-medium text-wa-gray-800 caret-transparent transition-colors focus:border-[1.5px] focus:border-wa-blue-600 focus:bg-white focus:outline-none",
              digit && "bg-white",
              error && "animate-shake border-[1.5px] border-wa-error",
            )}
          />
        ))}
      </div>
      {error ? <p className="text-center text-body-sm text-wa-error">{error}</p> : null}
    </div>
  );
}
