// FILE: src/components/ui/select.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: A native select keeps settings and filters accessible while using
 * the same field sizing and focus treatment as shadcn inputs.
 */
import * as React from "react";

import { cn } from "@/lib/utils";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-12 w-full rounded-lg border border-wa-gray-100 bg-wa-gray-50 px-3 text-body-sm text-wa-gray-800 transition-colors duration-150 focus-visible:border-[1.5px] focus-visible:border-wa-blue-600 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-wa-blue-50 disabled:cursor-not-allowed disabled:bg-wa-gray-100 disabled:text-wa-gray-400 sm:h-14 sm:px-4 sm:text-body md:h-[52px]",
        className,
      )}
      {...props}
    />
  ),
);
Select.displayName = "Select";
