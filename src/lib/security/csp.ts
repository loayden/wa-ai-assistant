// FILE: src/lib/security/csp.ts
/*
 * [ROLE: SECURITY ENGINEER]
 * Decision: CSP is assembled in one shared helper so middleware and tests keep
 * the production policy controlled from one source without weakening script
 * execution. Style inline allowances are intentionally limited to styles
 * because Meta SDK and component libraries inject style elements we cannot
 * nonce.
 */

export function createNonce(): string {
  return crypto.randomUUID().replaceAll("-", "");
}

export function buildContentSecurityPolicy(nonce: string, nodeEnv = process.env.NODE_ENV): string {
  const developmentScriptPolicy = nodeEnv === "development" ? " 'unsafe-eval'" : "";
  const scriptSources = [
    "'self'",
    `'nonce-${nonce}'`,
    "blob:",
    ...(developmentScriptPolicy ? [developmentScriptPolicy.trim()] : []),
    "https://connect.facebook.net",
    "https://accounts.google.com",
    "https://www.gstatic.com",
    "https://www.googletagmanager.com",
    "https://vercel.live",
  ].join(" ");
  const styleSources = [
    "'self'",
    "'unsafe-inline'",
    "https://fonts.googleapis.com",
  ].join(" ");

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self' https://accept.paymob.com",
    `script-src ${scriptSources}`,
    `style-src ${styleSources}`,
    "style-src-attr 'unsafe-inline'",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https: https://lookaside.fbsbx.com https://scontent.xx.fbcdn.net https://*.cdn.whatsapp.net https://images.pexels.com https://vercel.live",
    "connect-src 'self' wss: https://*.supabase.co wss://*.supabase.co https://api.openai.com https://api.anthropic.com https://graph.facebook.com https://accept.paymob.com https://*.paymob.com https://connect.facebook.net https://www.facebook.com https://web.facebook.com https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com https://www.google-analytics.com https://www.googletagmanager.com https://api.resend.com https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://vercel.live https://*.vercel.live wss://*.pusher.com https://*.pusher.com",
    "frame-src https://accept.paymob.com https://*.paymob.com https://www.facebook.com https://web.facebook.com https://staticxx.facebook.com https://accounts.google.com https://*.google.com https://vercel.live",
    "media-src 'self' blob: https://lookaside.fbsbx.com https://scontent.xx.fbcdn.net https://*.cdn.whatsapp.net",
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function getSecurityHeaders(nonce: string): Array<[string, string]> {
  return [
    ["Content-Security-Policy", buildContentSecurityPolicy(nonce)],
    ["Referrer-Policy", "strict-origin-when-cross-origin"],
    ["X-Frame-Options", "DENY"],
    ["X-Content-Type-Options", "nosniff"],
    ["Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(self)"],
    ["Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload"],
  ];
}
