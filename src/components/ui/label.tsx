// FILE: src/components/ui/label.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Labels use one compact text treatment for all form fields and
 * maintain explicit `htmlFor` wiring.
 */
import * as React from "react";

import { cn } from "@/lib/utils";

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label ref={ref} className={cn("text-sm font-medium leading-none", className)} {...props} />
  ),
);
Label.displayName = "Label";
