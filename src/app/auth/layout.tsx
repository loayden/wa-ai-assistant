/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Supabase confirmation screens share the same footer and calm shell
 * as the primary auth pages, so users are never dropped into an unfinished route.
 */
import type { Metadata } from "next";

import { AppFooter } from "@/components/shared/AppFooter";
import { noIndexMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = noIndexMetadata;

export default function AuthUtilityLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="min-h-screen bg-wa-gray-50 text-wa-gray-900">
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        {children}
      </div>
      <AppFooter compact />
    </main>
  );
}
