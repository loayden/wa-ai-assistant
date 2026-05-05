// FILE: src/components/ui/accordion.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Native disclosure keeps setup instructions accessible and avoids
 * extra client JavaScript for simple accordion behavior.
 */
import * as React from "react";

import { cn } from "@/lib/utils";

export function Accordion({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border", className)} {...props} />;
}

export function AccordionItem({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group border-b last:border-b-0">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium">{title}</summary>
      <div className="px-4 pb-4 text-sm text-muted-foreground">{children}</div>
    </details>
  );
}
