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
    <div className="min-h-screen bg-wa-gray-50">
      <TopBar
        isAdmin={Boolean(appUser.isAdmin)}
        planTier={appUser.planTier}
        userEmail={user.email ?? null}
        userName={fullName}
      />
      <main className="min-h-screen bg-wa-gray-50 pb-24 pt-14 md:pb-10 md:pt-16">
        {children}
      </main>
    </div>
  );
}
