// FILE: src/app/(dashboard)/dashboard/page.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Mock mode is read on the server so client code never needs direct
 * access to private environment configuration.
 */
import { DashboardPageClient } from "@/components/dashboard/DashboardPageClient";
import { getDashboardBootstrap } from "@/lib/server/dashboard-bootstrap";

export default async function DashboardPage() {
  const bootstrap = await getDashboardBootstrap();

  if (!bootstrap) {
    return null;
  }

  return (
    <DashboardPageClient
      initialConnection={bootstrap.connections[0] ?? null}
      initialMessages={bootstrap.messages}
      initialSettings={bootstrap.settings}
      initialUser={bootstrap.user}
      mockMode={process.env.WHATSAPP_MOCK_MODE === "true"}
    />
  );
}
