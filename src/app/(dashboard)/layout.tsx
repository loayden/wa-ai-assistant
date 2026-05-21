// FILE: src/app/(dashboard)/layout.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Protected pages now share a compact command-center shell so the
 * assistant toggle and conversation surfaces stay visually primary.
 */
import { TopBar } from "@/components/shared/TopBar";
import { AppFooter } from "@/components/shared/AppFooter";
import { ensureAppUser } from "@/lib/api/auth";
import { getUser } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getUser();
  const appUser = user ? await ensureAppUser(user) : null;
  const fullName =
    typeof user?.user_metadata.full_name === "string" ? user.user_metadata.full_name : appUser?.fullName ?? null;

  return (
    <div className="min-h-screen bg-wa-gray-50">
      <TopBar planTier={appUser?.planTier ?? "FREE"} userEmail={user?.email ?? null} userName={fullName} />
      <main className="min-h-screen bg-wa-gray-50 pb-24 pt-14 md:pb-10 md:pt-16">
        {children}
      </main>
      <AppFooter compact className="pb-24 md:pb-0" />
    </div>
  );
}
