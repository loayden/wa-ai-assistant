// FILE: src/lib/auth/redirect-url.ts
/*
 * Decision: Auth email redirects prefer an explicit override first, then a
 * public request origin, and only fall back to the configured app URL.
 */

type RedirectRequest = Pick<Request, "headers">;

function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function sanitizeOrigin(candidate: string | null) {
  if (!candidate) {
    return null;
  }

  try {
    const url = new URL(candidate);

    if (isLocalHostname(url.hostname)) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

function originFromHeaders(request: RedirectRequest) {
  const directOrigin = sanitizeOrigin(request.headers.get("origin"));

  if (directOrigin) {
    return directOrigin;
  }

  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";

  if (!forwardedHost) {
    return null;
  }

  return sanitizeOrigin(`${forwardedProto}://${forwardedHost}`);
}

function joinOrigin(origin: string, path: string) {
  return `${origin.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

export function resolveSignupRedirectUrl(options: {
  explicitRedirectUrl?: string | null;
  fallbackAppUrl: string;
  path?: string;
  request: RedirectRequest;
}) {
  const path = options.path ?? "/login";
  const explicitRedirectUrl = options.explicitRedirectUrl?.trim();

  if (explicitRedirectUrl) {
    return explicitRedirectUrl;
  }

  const publicOrigin = originFromHeaders(options.request);

  if (publicOrigin) {
    return joinOrigin(publicOrigin, path);
  }

  return joinOrigin(options.fallbackAppUrl, path);
}
