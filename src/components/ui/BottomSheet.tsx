// FILE: src/components/ui/BottomSheet.tsx
"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Advanced content appears in a bottom sheet so the command center
 * keeps one primary action while preserving access to secondary controls.
 */
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
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
  const reduceMotion = useReducedMotion();

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title ?? "لوحة خيارات"}>
      <motion.button
        className="absolute inset-0 bg-black/30"
        aria-label="إغلاق اللوحة"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={reduceMotion ? undefined : { opacity: 1 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
      />
      <motion.section
        initial={reduceMotion ? false : { y: "100%" }}
        animate={reduceMotion ? undefined : { y: 0 }}
        transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-2xl bg-white px-4 pb-5 pt-2 shadow-wa-2 sm:max-h-[85vh] sm:px-5 sm:pb-6",
          className,
        )}
      >
        <div className="mx-auto mt-3 h-1 w-9 rounded-full bg-wa-gray-200" />
        <div className="mb-3 mt-3 flex items-center justify-between gap-3 sm:mb-4 sm:gap-4">
          {title ? <h2 className="text-h3 font-medium text-wa-gray-900 sm:text-h2">{title}</h2> : <span />}
          <IconButton label="إغلاق اللوحة" onClick={onClose}>
            <X aria-hidden="true" />
          </IconButton>
        </div>
        {children}
      </motion.section>
    </div>
  );
}
