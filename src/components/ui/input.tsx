// FILE: src/components/ui/input.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: A shared input primitive keeps focus, disabled, and invalid states
 * uniform across auth, WhatsApp, and settings forms.
 */
import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, hasError = false, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "glass-control flex h-12 w-full rounded-xl px-3 text-body-sm text-wa-gray-800 transition-colors duration-150 file:border-0 file:bg-transparent file:text-body-sm file:font-medium placeholder:text-wa-gray-400 focus-visible:border-[1.5px] focus-visible:border-wa-blue-600 focus-visible:bg-white/92 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:bg-white/42 disabled:text-wa-gray-400 sm:h-14 sm:px-4 sm:text-body md:h-[52px]",
        hasError && "border-[1.5px] border-wa-error bg-wa-error-bg",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
