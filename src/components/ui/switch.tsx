// FILE: src/components/ui/switch.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Switch wraps checkbox semantics for binary settings such as
 * auto-reply without sacrificing keyboard accessibility.
 */
import * as React from "react";

import { cn } from "@/lib/utils";

export type SwitchProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    type="checkbox"
    role="switch"
    className={cn(
      "h-6 w-11 cursor-pointer appearance-none rounded-full border border-input bg-muted transition-colors checked:bg-primary before:block before:size-5 before:translate-x-0 before:rounded-full before:bg-background before:shadow before:transition-transform checked:before:translate-x-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Switch.displayName = "Switch";
