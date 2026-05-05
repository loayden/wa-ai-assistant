// FILE: src/components/ui/checkbox.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Native checkbox behavior is wrapped with shadcn-compatible styling
 * for auth and settings forms without adding more runtime dependencies.
 */
import * as React from "react";

import { cn } from "@/lib/utils";

export const Checkbox = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type: _type, ...props }, ref) => {
    void _type;

    return (
      <input
        ref={ref}
        type="checkbox"
        className={cn("size-4 rounded border border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
        {...props}
      />
    );
  },
);
Checkbox.displayName = "Checkbox";
