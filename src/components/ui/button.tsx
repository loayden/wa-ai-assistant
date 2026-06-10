// FILE: src/components/ui/button.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Button variants mirror shadcn/ui composition while staying local so
 * the Phase 8 UI can rely on stable source-controlled primitives.
 */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl text-body-sm font-medium tracking-normal transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-wa-gray-200 disabled:text-wa-gray-400 sm:min-h-11 sm:text-body",
  {
    variants: {
      variant: {
        default: "bg-wa-blue-600 text-white shadow-[0_16px_38px_rgba(26,86,255,0.26)] hover:bg-[#1447E6] active:scale-[0.98] active:bg-[#1040D4]",
        destructive: "bg-wa-error text-white hover:bg-wa-error active:scale-[0.98]",
        outline: "glass-control text-wa-gray-700 hover:bg-white/92 active:scale-[0.98]",
        secondary: "bg-white/68 text-wa-gray-800 shadow-[0_10px_28px_rgba(4,44,83,0.08)] hover:bg-white/88 active:scale-[0.98]",
        ghost: "border border-white/60 bg-white/36 text-wa-gray-600 hover:bg-white/72 active:scale-[0.98]",
        link: "h-auto min-h-0 rounded-none p-0 text-wa-blue-600 underline-offset-4 hover:underline disabled:bg-transparent",
      },
      size: {
        default: "h-12 px-4 sm:h-14 sm:px-6 md:h-[54px]",
        sm: "h-10 px-3 text-body-sm sm:h-11 sm:px-4",
        lg: "h-12 px-5 text-body-sm sm:h-14 sm:px-7 sm:text-body md:h-[54px]",
        icon: "size-10 p-0 sm:size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, className, disabled, isLoading = false, variant, size, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <span className="size-[18px] animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" /> : children}
    </button>
  ),
);

Button.displayName = "Button";

export { buttonVariants };
