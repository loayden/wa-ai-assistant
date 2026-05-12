// FILE: src/components/ui/BottomSheet.tsx
"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Advanced content appears in a bottom sheet so the command center
 * keeps one primary action while preserving access to secondary controls.
 */
import type { ReactNode } from "react";
import { X } from "lucide-react";

import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/utils";

export interface BottomSheetProps {
  open: boolean;
  title?: string;
  children: ReactNode;
  className?: string;
  onClose: () => void;
}

export function BottomSheet({ children, className, onClose, open, title }: BottomSheetProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title ?? "Bottom sheet"}>
      <button className="absolute inset-0 bg-black/30 transition-opacity duration-250" aria-label="Close sheet" onClick={onClose} />
      <section
        className={cn(
          "absolute inset-x-0 bottom-0 max-h-[85vh] animate-slide-up overflow-y-auto rounded-t-2xl bg-white px-5 pb-6 pt-2 shadow-wa-2",
          className,
        )}
      >
        <div className="mx-auto mt-3 h-1 w-9 rounded-full bg-wa-gray-200" />
        <div className="mb-4 mt-3 flex items-center justify-between gap-4">
          {title ? <h2 className="text-h2 font-medium text-wa-gray-900">{title}</h2> : <span />}
          <IconButton label="Close sheet" onClick={onClose}>
            <X aria-hidden="true" />
          </IconButton>
        </div>
        {children}
      </section>
    </div>
  );
}
