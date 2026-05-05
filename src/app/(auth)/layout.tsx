// FILE: src/app/(auth)/layout.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Auth routes use a focused split-free shell so account forms remain
 * the primary task on mobile and desktop.
 */
import Link from "next/link";
import { BotMessageSquare } from "lucide-react";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="flex min-h-screen flex-col bg-muted/30">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <BotMessageSquare className="size-5" aria-hidden="true" />
          </span>
          <span>WA-AI Assistant</span>
        </Link>
      </div>
      <section className="flex flex-1 items-center justify-center px-4 py-10">{children}</section>
    </main>
  );
}
