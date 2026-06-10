// FILE: src/middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Middleware centralizes auth protection for dashboard pages and
 * authenticated APIs while leaving webhook, auth, and health endpoints reachable
 * before a user has a session.
 */
import { createPublicMiddlewareResponse, updateSession } from "@/lib/supabase/middleware";
import { createNonce, getSecurityHeaders } from "@/lib/security/csp";
import { normalizeAuthNextPath } from "@/lib/auth/redirect-url";

const PUBLIC_API_PREFIXES = ["/api/webhooks", "/api/auth", "/api/health"];
const PUBLIC_API_PATHS = new Set([
  "/api/billing/paymob-return",
  "/api/cron/process-broadcasts",
  "/api/cron/daily-summary",
  "/api/cron/weekly-report",
  "/api/cron/expire-trials",
  "/api/marketing/events",
]);
const DASHBOARD_PAGE_PREFIXES = [
  "/dashboard",
  "/inbox",
  "/messages",
  "/settings",
  "/billing",
  "/whatsapp",
  "/knowledge",
  "/templates",
  "/broadcasts",
  "/products",
  "/orders",
  "/corrections",
  "/leads",
  "/analytics",
  "/readiness",
  "/connect",
  "/support",
  "/admin",
];
const AUTH_PAGE_PATHS = new Set(["/login", "/signup"]);

function isPublicApiPath(pathname: string): boolean {
  return PUBLIC_API_PATHS.has(pathname) || PUBLIC_API_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

function isProtectedPagePath(pathname: string): boolean {
  return DASHBOARD_PAGE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isAuthPagePath(pathname: string): boolean {
  return AUTH_PAGE_PATHS.has(pathname);
}

function getAuthenticatedLandingPath(request: NextRequest): string {
  const nextPath = normalizeAuthNextPath(request.nextUrl.searchParams.get("next"));

  return isAuthPagePath(nextPath) ? "/connect" : nextPath;
}

function isE2EAuthBypassEnabled(request: NextRequest): boolean {
  const bypassSecret = process.env.E2E_AUTH_BYPASS_SECRET;

  return process.env.NODE_ENV !== "production" && !!bypassSecret && request.headers.get("x-e2e-auth-bypass") === bypassSecret;
}

function createNonceHeaders(request: NextRequest): { nonce: string; requestHeaders: Headers } {
  const nonce = createNonce();
  const requestHeaders = new Headers(request.headers);

  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("x-csp-nonce", nonce);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  return { nonce, requestHeaders };
}

function applySecurityHeaders(response: NextResponse, nonce: string): NextResponse {
  for (const [header, value] of getSecurityHeaders(nonce)) {
    response.headers.set(header, value);
  }

  return response;
}

function createUnauthenticatedResponse(request: NextRequest, sessionResponse: NextResponse, nonce: string): NextResponse {
  if (isApiPath(request.nextUrl.pathname)) {
    const response = NextResponse.json(
      {
        success: false,
        error: "Authentication required.",
      },
      { status: 401 },
    );

    sessionResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value, cookie);
    });

    return applySecurityHeaders(response, nonce);
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", request.nextUrl.pathname);

  const response = NextResponse.redirect(loginUrl);

  sessionResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value, cookie);
  });

  return applySecurityHeaders(response, nonce);
}

function createAuthenticatedAuthPageResponse(request: NextRequest, sessionResponse: NextResponse, nonce: string): NextResponse {
  const redirectUrl = new URL(getAuthenticatedLandingPath(request), request.url);
  const response = NextResponse.redirect(redirectUrl);

  sessionResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value, cookie);
  });

  return applySecurityHeaders(response, nonce);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { nonce, requestHeaders } = createNonceHeaders(request);

  if (isPublicApiPath(pathname)) {
    return applySecurityHeaders(createPublicMiddlewareResponse(request, requestHeaders), nonce);
  }

  if (isAuthPagePath(pathname)) {
    const { response, user } = await updateSession(request, requestHeaders);

    if (user) {
      return createAuthenticatedAuthPageResponse(request, response, nonce);
    }

    return applySecurityHeaders(response, nonce);
  }

  if (!isApiPath(pathname) && !isProtectedPagePath(pathname)) {
    return applySecurityHeaders(createPublicMiddlewareResponse(request, requestHeaders), nonce);
  }

  if (isE2EAuthBypassEnabled(request)) {
    return applySecurityHeaders(createPublicMiddlewareResponse(request, requestHeaders), nonce);
  }

  const { response, user } = await updateSession(request, requestHeaders);

  if (!user) {
    return createUnauthenticatedResponse(request, response, nonce);
  }

  return applySecurityHeaders(response, nonce);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
