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
  "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl text-body font-medium tracking-normal transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-wa-blue-50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-wa-gray-200 disabled:text-wa-gray-400",
  {
    variants: {
      variant: {
        default: "bg-wa-blue-600 text-white hover:bg-[#1447E6] active:scale-[0.98] active:bg-[#1040D4]",
        destructive: "bg-wa-error text-white hover:bg-wa-error active:scale-[0.98]",
        outline: "border border-wa-gray-200 bg-transparent text-wa-gray-600 hover:border-wa-gray-400 hover:bg-wa-gray-50 active:scale-[0.98] active:bg-wa-gray-100",
        secondary: "bg-wa-gray-50 text-wa-gray-800 hover:bg-wa-gray-100 active:scale-[0.98]",
        ghost: "border border-wa-gray-200 bg-transparent text-wa-gray-600 hover:border-wa-gray-400 hover:bg-wa-gray-50 active:scale-[0.98]",
        link: "h-auto min-h-0 rounded-none p-0 text-wa-blue-600 underline-offset-4 hover:underline disabled:bg-transparent",
      },
      size: {
        default: "h-14 px-6 md:h-[54px]",
        sm: "h-11 px-4 text-body-sm",
        lg: "h-14 px-7 text-body md:h-[54px]",
        icon: "size-11 p-0",
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
