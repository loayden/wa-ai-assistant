import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import { middleware } from "@/middleware";
import { createPublicMiddlewareResponse } from "@/lib/supabase/middleware";

vi.mock("@/lib/supabase/middleware", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supabase/middleware")>();

  return {
    ...actual,
    updateSession: vi.fn(async (request: NextRequest, headers?: HeadersInit) => ({
      response: actual.createPublicMiddlewareResponse(request, headers),
      user: null,
      error: null,
    })),
  };
});

describe("security middleware", () => {
  it("adds a CSP that permits required SDK styles and blob workers without unsafe script execution", async () => {
    const response = await middleware(new NextRequest("https://kallem.vercel.app/login"));
    const csp = response.headers.get("content-security-policy");

    expect(csp).toContain("script-src 'self' 'nonce-");
    expect(csp?.match(/script-src[^;]*/)?.[0]).toContain("blob:");
    expect(csp).toContain("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com");
    expect(csp).toContain("style-src-attr 'unsafe-inline'");
    expect(csp).toContain("worker-src 'self' blob:");
    expect(csp).toContain("https://accounts.google.com");
    expect(csp?.match(/script-src[^;]*/)?.[0]).toContain("https://vercel.live");
    expect(csp?.match(/script-src[^;]*/)?.[0]).toContain("https://www.googletagmanager.com");
    expect(csp?.match(/connect-src[^;]*/)?.[0]).toContain("https://www.google-analytics.com");
    expect(csp?.match(/connect-src[^;]*/)?.[0]).toContain("https://www.googletagmanager.com");
    expect(csp).not.toContain("script-src-elem");
    expect(csp).not.toContain("style-src-elem");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp?.match(/script-src[^;]*/)?.[0]).not.toContain("'unsafe-inline'");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it.each(["/dashboard", "/readiness", "/inbox", "/connect", "/admin"])(
    "redirects unauthenticated protected page %s to login with next path",
    async (pathname) => {
      const response = await middleware(new NextRequest(`https://kallem.vercel.app${pathname}`));

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(`https://kallem.vercel.app/login?next=${encodeURIComponent(pathname)}`);
    },
  );

  it("redirects authenticated users away from login to the requested app page", async () => {
    const { updateSession } = await import("@/lib/supabase/middleware");
    vi.mocked(updateSession).mockResolvedValueOnce({
      response: createPublicMiddlewareResponse(new NextRequest("https://kallem.vercel.app/login?next=%2Fmessages")),
      user: {
        id: "user-1",
        app_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
        user_metadata: {},
      },
      error: null,
    });

    const response = await middleware(new NextRequest("https://kallem.vercel.app/login?next=%2Fmessages"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://kallem.vercel.app/messages");
  });

  it("keeps authenticated users away from signup loops", async () => {
    const { updateSession } = await import("@/lib/supabase/middleware");
    vi.mocked(updateSession).mockResolvedValueOnce({
      response: createPublicMiddlewareResponse(new NextRequest("https://kallem.vercel.app/signup?next=%2Flogin")),
      user: {
        id: "user-1",
        app_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
        user_metadata: {},
      },
      error: null,
    });

    const response = await middleware(new NextRequest("https://kallem.vercel.app/signup?next=%2Flogin"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://kallem.vercel.app/connect");
  });
});
