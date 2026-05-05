// FILE: src/app/(dashboard)/layout.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Protected pages share a persistent operational shell with sidebar
 * navigation and a constrained content region.
 */
import { Sidebar } from "@/components/shared/Sidebar";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-muted/20">
      <Sidebar />
      <main className="lg:ml-64">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
