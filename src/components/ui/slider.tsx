// FILE: src/components/ui/slider.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Native range input is sufficient for reply length control and keeps
 * the value accessible to form libraries.
 */
import * as React from "react";

import { cn } from "@/lib/utils";

export const Slider = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type: _type, ...props }, ref) => {
    void _type;

    return <input ref={ref} type="range" className={cn("w-full accent-primary", className)} {...props} />;
  },
);
Slider.displayName = "Slider";
