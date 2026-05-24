// FILE: src/lib/supabase/middleware.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Middleware uses a request-scoped Supabase SSR client so auth tokens
 * can be refreshed and written back to both the request and browser response.
 */
import { createServerClient } from "@supabase/ssr";
import type { AuthError, User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

const USER_ID_HEADER = "x-user-id";
const USER_EMAIL_HEADER = "x-user-email";

export type UpdateSessionResult = {
  response: NextResponse;
  user: User | null;
  error: AuthError | null;
};

function getSupabaseMiddlewareConfig(): { supabaseUrl: string; supabaseAnonKey: string } {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase middleware environment variables.");
  }

  return { supabaseUrl, supabaseAnonKey };
}

function createSanitizedRequestHeaders(request: NextRequest, extraHeaders?: HeadersInit): Headers {
  const requestHeaders = new Headers(request.headers);

  requestHeaders.delete(USER_ID_HEADER);
  requestHeaders.delete(USER_EMAIL_HEADER);

  if (extraHeaders) {
    new Headers(extraHeaders).forEach((value, key) => {
      requestHeaders.set(key, value);
    });
  }

  return requestHeaders;
}

function copySessionCookies(source: NextResponse, target: NextResponse): NextResponse {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie.name, cookie.value, cookie);
  });

  ["cache-control", "expires", "pragma"].forEach((headerName) => {
    const headerValue = source.headers.get(headerName);

    if (headerValue) {
      target.headers.set(headerName, headerValue);
    }
  });

  return target;
}

function createMiddlewareResponse(
  request: NextRequest,
  requestHeaders: Headers,
  previousResponse?: NextResponse,
): NextResponse {
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set("Cache-Control", "private, no-cache, no-store, max-age=0, must-revalidate");

  if (!previousResponse) {
    return response;
  }

  return copySessionCookies(previousResponse, response);
}

export function createPublicMiddlewareResponse(request: NextRequest, extraRequestHeaders?: HeadersInit): NextResponse {
  return createMiddlewareResponse(request, createSanitizedRequestHeaders(request, extraRequestHeaders));
}

export async function updateSession(request: NextRequest, extraRequestHeaders?: HeadersInit): Promise<UpdateSessionResult> {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseMiddlewareConfig();
  const requestHeaders = createSanitizedRequestHeaders(request, extraRequestHeaders);
  let response = createMiddlewareResponse(request, requestHeaders);

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = createMiddlewareResponse(request, requestHeaders, response);

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });

        Object.entries(headers).forEach(([headerName, headerValue]) => {
          response.headers.set(headerName, headerValue);
        });
      },
    },
  });

  /*
   * [ROLE: BACKEND ENGINEER]
   * Decision: `getUser()` verifies the token with Supabase Auth before we trust
   * identity data, and the SSR client refreshes expired sessions during this call.
   */
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (user) {
    requestHeaders.set(USER_ID_HEADER, user.id);

    if (user.email) {
      requestHeaders.set(USER_EMAIL_HEADER, user.email);
    }

    response = createMiddlewareResponse(request, requestHeaders, response);
  }

  return { response, user, error };
}
