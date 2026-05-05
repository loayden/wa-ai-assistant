// FILE: src/app/(dashboard)/whatsapp/page.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Environment-derived mock mode and webhook base URL are passed from
 * the server so client components only receive safe configuration.
 */
import { WhatsAppPageClient } from "@/components/whatsapp/WhatsAppPageClient";

export default function WhatsAppPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">WhatsApp</h1>
        <p className="text-sm text-muted-foreground">Connect WhatsApp Cloud API or use mock mode for local inbound message testing.</p>
      </div>
      <WhatsAppPageClient
        appUrl={process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}
        mockMode={process.env.WHATSAPP_MOCK_MODE === "true"}
      />
    </div>
  );
}
