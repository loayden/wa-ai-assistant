// FILE: src/lib/security/csp.ts
/*
 * [ROLE: SECURITY ENGINEER]
 * Decision: CSP is assembled in one shared helper so middleware and tests keep
 * the production policy nonce-based without weakening local development.
 */

export function createNonce(): string {
  return crypto.randomUUID().replaceAll("-", "");
}

export function buildContentSecurityPolicy(nonce: string, nodeEnv = process.env.NODE_ENV): string {
  const developmentScriptPolicy = nodeEnv === "development" ? " 'unsafe-eval'" : "";
  const developmentStylePolicy = nodeEnv === "development" ? " 'unsafe-inline'" : "";
  const scriptSources = [
    "'self'",
    `'nonce-${nonce}'`,
    ...(developmentScriptPolicy ? [developmentScriptPolicy.trim()] : []),
    "https://connect.facebook.net",
    "https://www.googletagmanager.com",
    "https://accounts.google.com",
    "https://www.gstatic.com",
  ].join(" ");
  const styleSources = [
    "'self'",
    `'nonce-${nonce}'`,
    ...(developmentStylePolicy ? [developmentStylePolicy.trim()] : []),
    "https://fonts.googleapis.com",
  ].join(" ");

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src ${scriptSources}`,
    `script-src-elem ${scriptSources}`,
    `style-src ${styleSources}`,
    `style-src-elem ${styleSources}`,
    "style-src-attr 'unsafe-inline'",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https: https://lookaside.fbsbx.com https://scontent.xx.fbcdn.net https://*.cdn.whatsapp.net https://images.pexels.com",
    "connect-src 'self' https://*.supabase.co https://api.openai.com https://api.anthropic.com https://graph.facebook.com https://accept.paymob.com https://*.paymob.com https://connect.facebook.net https://www.facebook.com https://web.facebook.com https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.us.sentry.io",
    "frame-src https://accept.paymob.com https://*.paymob.com https://www.facebook.com https://web.facebook.com https://accounts.google.com https://*.google.com",
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
