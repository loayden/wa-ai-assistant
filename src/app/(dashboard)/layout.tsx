// FILE: src/app/(dashboard)/layout.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Protected pages now share a compact command-center shell so the
 * assistant toggle and conversation surfaces stay visually primary.
 */
import { TopBar } from "@/components/shared/TopBar";
import { getUser } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getUser();
  const fullName = typeof user?.user_metadata.full_name === "string" ? user.user_metadata.full_name : null;

  return (
    <div className="min-h-screen bg-wa-gray-50">
      <TopBar userEmail={user?.email ?? null} userName={fullName} />
      <main className="min-h-screen bg-wa-gray-50 pb-safe pt-14">
        {children}
      </main>
    </div>
  );
}
