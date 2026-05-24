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

const PUBLIC_API_PREFIXES = ["/api/webhooks", "/api/auth", "/api/health"];
const PUBLIC_API_PATHS = new Set([
  "/api/billing/paymob-return",
  "/api/cron/process-broadcasts",
  "/api/cron/daily-summary",
  "/api/cron/weekly-report",
  "/api/cron/expire-trials",
]);
const DASHBOARD_PAGE_PREFIXES = [
  "/dashboard",
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
  "/connect",
  "/support",
  "/admin",
];

function isPublicApiPath(pathname: string): boolean {
  return PUBLIC_API_PATHS.has(pathname) || PUBLIC_API_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

function isProtectedPagePath(pathname: string): boolean {
  return DASHBOARD_PAGE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isE2EAuthBypassEnabled(request: NextRequest): boolean {
  const bypassSecret = process.env.E2E_AUTH_BYPASS_SECRET;

  return process.env.NODE_ENV !== "production" && !!bypassSecret && request.headers.get("x-e2e-auth-bypass") === bypassSecret;
}

function createNonceHeaders(request: NextRequest): { nonce: string; requestHeaders: Headers } {
  const nonce = createNonce();
  const requestHeaders = new Headers();

  requestHeaders.set("x-nonce", nonce);
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { nonce, requestHeaders } = createNonceHeaders(request);

  if (isPublicApiPath(pathname)) {
    return applySecurityHeaders(createPublicMiddlewareResponse(request, requestHeaders), nonce);
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
