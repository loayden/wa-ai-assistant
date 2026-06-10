// FILE: src/app/(dashboard)/layout.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Protected pages now share a compact command-center shell so the
 * assistant toggle and conversation surfaces stay visually primary.
 */
import type { Metadata } from "next";
import { TopBar } from "@/components/shared/TopBar";
import { ensureAppUser } from "@/lib/api/auth";
import { noIndexMetadata } from "@/lib/marketing/seo";
import { getUser } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const metadata: Metadata = noIndexMetadata;

function getLoginRedirectPath(pathname: string | null): string {
  const nextPath = pathname?.startsWith("/") ? pathname : "/dashboard";
  const params = new URLSearchParams({ next: nextPath });

  return `/login?${params.toString()}`;
}

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getUser();
  if (!user) {
    const requestHeaders = await headers();
    redirect(getLoginRedirectPath(requestHeaders.get("x-pathname")));
  }

  const appUser = await ensureAppUser(user);
  const fullName =
    typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : appUser.fullName ?? null;

  return (
    <div className="app-glass-background relative min-h-screen overflow-hidden">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.16)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.14)_1px,transparent_1px)] bg-[size:72px_72px] opacity-30" />
      <div className="pointer-events-none fixed inset-x-0 top-0 h-44 bg-white/12 blur-3xl" />
      <TopBar
        isAdmin={Boolean(appUser.isAdmin)}
        planTier={appUser.planTier}
        userEmail={user.email ?? null}
        userName={fullName}
      />
      <main className="relative mx-auto min-h-screen w-full max-w-[1520px] px-2 pb-24 pt-[4.5rem] sm:px-4 md:pb-5 md:pl-[92px] md:pt-20 xl:px-5">
        <div className="glass-surface min-h-[calc(100vh-6.5rem)] overflow-hidden rounded-[28px] p-2 sm:rounded-[34px] sm:p-3 md:min-h-[calc(100vh-6.25rem)]">
          <div className="min-h-[calc(100vh-7.5rem)] rounded-[24px] bg-white/46 md:min-h-[calc(100vh-7.75rem)]">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
