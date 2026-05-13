// FILE: src/app/(dashboard)/whatsapp/page.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Environment-derived mock mode and webhook base URL are passed from
 * the server so client components only receive safe configuration.
 */
import { WhatsAppPageClient } from "@/components/whatsapp/WhatsAppPageClient";

export default function WhatsAppPage() {
  return (
    <WhatsAppPageClient
      apiVersion={process.env.WHATSAPP_API_VERSION ?? "v19.0"}
      appUrl={process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}
      embeddedSignupAppId={process.env.WHATSAPP_APP_ID ?? null}
      embeddedSignupConfigId={process.env.WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID ?? null}
      mockMode={process.env.WHATSAPP_MOCK_MODE === "true"}
    />
  );
}
