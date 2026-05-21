"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";

import { cn } from "@/lib/utils";

type MagneticLinkProps = {
  children: ReactNode;
  className?: string;
  href: string;
};

export function MagneticLink({ children, className, href }: MagneticLinkProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 220, damping: 18, mass: 0.45 });
  const springY = useSpring(y, { stiffness: 220, damping: 18, mass: 0.45 });
  const shineX = useTransform(springX, [-18, 18], ["18%", "82%"]);

  const handleMouseMove = (event: MouseEvent<HTMLAnchorElement>) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - rect.left - rect.width / 2) * 0.16);
    y.set((event.clientY - rect.top - rect.height / 2) * 0.16);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div style={{ x: springX, y: springY }} className="inline-flex">
      <Link
        href={href}
        onMouseLeave={reset}
        onMouseMove={handleMouseMove}
        className={cn(
          "group relative inline-flex min-h-12 items-center justify-center overflow-hidden rounded-full px-5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wa-blue-600 sm:min-h-14 sm:px-7 sm:text-[15px]",
          className,
        )}
      >
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 h-full w-24 -translate-x-1/2 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.24),transparent)] opacity-0 blur-sm transition-opacity duration-300 group-hover:opacity-100"
          style={{ left: shineX }}
        />
        <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
      </Link>
    </motion.div>
  );
}
