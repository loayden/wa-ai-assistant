// FILE: src/components/shared/LogoMark.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Navigation uses the app icon as the primary brand mark so the
 * shell stays compact and recognizable across desktop and mobile.
 */
import Image from "next/image";

import { cn } from "@/lib/utils";

export interface LogoMarkProps {
  className?: string;
  imageClassName?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const SIZE_CLASSES: Record<NonNullable<LogoMarkProps["size"]>, string> = {
  sm: "size-9 rounded-[14px]",
  md: "size-11 rounded-[17px]",
  lg: "size-12 rounded-[18px]",
  xl: "size-14 rounded-[22px]",
};

export function LogoMark({ className, imageClassName, size = "md" }: LogoMarkProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden bg-white shadow-[0_12px_30px_rgba(4,44,83,0.10)] ring-1 ring-white/80",
        SIZE_CLASSES[size],
        className,
      )}
      aria-hidden="true"
    >
      <Image
        src="/icon.png"
        alt=""
        width={56}
        height={56}
        className={cn("size-full object-cover", imageClassName)}
        priority={false}
      />
    </span>
  );
}
