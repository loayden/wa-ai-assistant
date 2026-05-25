import { WhatsAppPageClient } from "@/components/whatsapp/WhatsAppPageClient";
import { getWhatsAppPageBootstrap } from "@/lib/server/dashboard-bootstrap";

export default async function ConnectPage() {
  const bootstrap = await getWhatsAppPageBootstrap();

  if (!bootstrap) {
    return null;
  }

  return (
    <WhatsAppPageClient
      apiVersion={process.env.WHATSAPP_API_VERSION ?? "v19.0"}
      appUrl={process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}
      embeddedSignupAppId={process.env.WHATSAPP_APP_ID ?? null}
      embeddedSignupConfigId={process.env.WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID ?? null}
      embeddedSignupEnabled={process.env.WHATSAPP_EMBEDDED_SIGNUP_ENABLED === "true"}
      initialConnections={bootstrap.connections}
      initialSettings={bootstrap.settings}
      mockMode={process.env.WHATSAPP_MOCK_MODE === "true"}
      planTier={bootstrap.user.planTier}
    />
  );
}
