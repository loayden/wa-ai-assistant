// FILE: src/app/(dashboard)/whatsapp/page.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Environment-derived mock mode and webhook base URL are passed from
 * the server so client components only receive safe configuration.
 */
import { WhatsAppPageClient } from "@/components/whatsapp/WhatsAppPageClient";
import { getWhatsAppPageBootstrap } from "@/lib/server/dashboard-bootstrap";

export default async function WhatsAppPage() {
  const bootstrap = await getWhatsAppPageBootstrap();
  const metaAppId = process.env.WHATSAPP_APP_ID ?? process.env.NEXT_PUBLIC_META_APP_ID ?? null;

  if (!bootstrap) {
    return null;
  }

  return (
    <WhatsAppPageClient
      apiVersion={process.env.WHATSAPP_API_VERSION ?? "v19.0"}
      appUrl={process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}
      embeddedSignupAppId={metaAppId}
      embeddedSignupConfigId={process.env.WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID ?? null}
      embeddedSignupEnabled={process.env.WHATSAPP_EMBEDDED_SIGNUP_ENABLED === "true"}
      initialConnections={bootstrap.connections}
      initialSettings={bootstrap.settings}
      mockMode={process.env.WHATSAPP_MOCK_MODE === "true"}
      planTier={bootstrap.user.planTier}
    />
  );
}
