// FILE: src/components/ui/IconButton.tsx
"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Icon-only actions need a dedicated primitive so touch size, focus
 * rings, and accessible labels stay consistent across sheets and overlays.
 */
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
  shape?: "rounded" | "circle";
}

export function IconButton({ children, className, label, shape = "rounded", type = "button", ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cn(
        "inline-flex size-11 items-center justify-center bg-wa-gray-50 text-wa-gray-600 transition-all duration-150 hover:bg-wa-gray-100 active:scale-95 active:bg-wa-gray-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-wa-blue-50 disabled:pointer-events-none disabled:opacity-40",
        shape === "circle" ? "rounded-full" : "rounded-xl",
        className,
      )}
      {...props}
    >
      <span className="[&>svg]:size-5 [&>svg]:stroke-[1.5px]">{children}</span>
    </button>
  );
}
