// FILE: src/app/(dashboard)/dashboard/page.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Mock mode is read on the server so client code never needs direct
 * access to private environment configuration.
 */
import { DashboardPageClient } from "@/components/dashboard/DashboardPageClient";

export default function DashboardPage() {
  return <DashboardPageClient mockMode={process.env.WHATSAPP_MOCK_MODE === "true"} />;
}
