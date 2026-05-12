// FILE: src/components/shared/BrandLogo.tsx
"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: The app uses one reusable text-only brand lockup so the bilingual
 * wordmark stays consistent across landing, auth, setup, and shell.
 */
import { cn } from "@/lib/utils";
import { BRAND_NAME, BRAND_NAME_AR, BRAND_TAGLINE } from "@/lib/utils/brand";

export interface BrandLogoProps {
  className?: string;
  layout?: "inline" | "stacked";
  showTagline?: boolean;
  wordmarkSize?: "sm" | "md" | "lg";
}

const WORDMARK_SIZES: Record<NonNullable<BrandLogoProps["wordmarkSize"]>, string> = {
  sm: "text-xl sm:text-2xl",
  md: "text-3xl sm:text-4xl",
  lg: "text-5xl sm:text-6xl",
};

export function BrandLogo({
  className,
  layout = "inline",
  showTagline = false,
  wordmarkSize = "md",
}: BrandLogoProps) {
  const isInline = layout === "inline";

  return (
    <div className={cn("flex text-left", isInline ? "items-center" : "flex-col items-center text-center", className)}>
      <div className={cn("flex flex-col", isInline ? "items-start" : "items-center")}>
        <div className={cn("flex flex-wrap items-end gap-x-3 gap-y-1 font-medium leading-none", WORDMARK_SIZES[wordmarkSize])}>
          <span className="tracking-[-0.03em] text-wa-gray-900">{BRAND_NAME}</span>
          <span lang="ar" dir="rtl" className="font-medium tracking-normal text-wa-blue-600">
            {BRAND_NAME_AR}
          </span>
        </div>
        {showTagline ? (
          <p className="mt-3 max-w-[380px] text-body text-wa-gray-600">
            {BRAND_TAGLINE}
          </p>
        ) : null}
      </div>
    </div>
  );
}
