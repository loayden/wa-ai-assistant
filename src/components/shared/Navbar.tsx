// FILE: src/components/shared/Navbar.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: The landing navbar keeps product identity and primary auth actions
 * visible without sharing dashboard-specific session controls.
 */
import Link from "next/link";

import { BrandLogo } from "@/components/shared/BrandLogo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <BrandLogo wordmarkSize="sm" />
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <Link href="/#features">Features</Link>
          <Link href="/#pricing">Pricing</Link>
          <Link href="/whatsapp">WhatsApp</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }))}>
            Login
          </Link>
          <Link href="/signup" className={cn(buttonVariants())}>
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}
