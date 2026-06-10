export const defaultSiteUrl = "https://kallem.vercel.app";

export const publicSeoRoutes = [
  "/",
  "/pricing",
  "/security",
  "/blog",
  "/blog/social-messages-to-orders",
  "/blog/meta-readiness-checklist",
  "/blog/train-ai-business-knowledge",
  "/features/whatsapp",
  "/features/instagram",
  "/features/ai",
  "/features/inbox",
  "/compare/respond-io",
  "/compare/respondio",
  "/compare/whatchimp",
  "/compare/whatschimp",
  "/instagram-messenger-ai",
  "/whatsapp-ai",
  "/privacy",
  "/terms",
  "/data-deletion",
] as const;

export type PublicSeoRoute = (typeof publicSeoRoutes)[number];

export function getSiteUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!rawUrl) {
    return defaultSiteUrl;
  }

  try {
    return new URL(rawUrl).origin;
  } catch {
    return defaultSiteUrl;
  }
}

export function getAbsoluteUrl(path: string) {
  return new URL(path, getSiteUrl()).toString();
}
