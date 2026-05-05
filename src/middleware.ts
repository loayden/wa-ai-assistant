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

const PUBLIC_API_PREFIXES = ["/api/webhooks", "/api/auth", "/api/health"];
const DASHBOARD_PAGE_PREFIXES = ["/dashboard", "/messages", "/settings", "/billing", "/whatsapp"];

function isPublicApiPath(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
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

function createUnauthenticatedResponse(request: NextRequest, sessionResponse: NextResponse): NextResponse {
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

    return response;
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", request.nextUrl.pathname);

  const response = NextResponse.redirect(loginUrl);

  sessionResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value, cookie);
  });

  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicApiPath(pathname)) {
    return createPublicMiddlewareResponse(request);
  }

  if (!isApiPath(pathname) && !isProtectedPagePath(pathname)) {
    return createPublicMiddlewareResponse(request);
  }

  if (isE2EAuthBypassEnabled(request)) {
    return createPublicMiddlewareResponse(request);
  }

  const { response, user } = await updateSession(request);

  if (!user) {
    return createUnauthenticatedResponse(request, response);
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/messages/:path*", "/settings/:path*", "/billing/:path*", "/whatsapp/:path*", "/api/:path*"],
};
