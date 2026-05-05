// FILE: src/app/(dashboard)/dashboard/page.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Mock mode is read on the server so client code never needs direct
 * access to private environment configuration.
 */
import { DashboardPageClient } from "@/components/dashboard/DashboardPageClient";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Monitor usage, automation health, and the latest WhatsApp activity.</p>
      </div>
      <DashboardPageClient mockMode={process.env.WHATSAPP_MOCK_MODE === "true"} />
    </div>
  );
}
