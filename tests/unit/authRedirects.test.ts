import { describe, expect, it } from "vitest";

import { buildOAuthRedirectUrl, normalizeAuthNextPath, resolveSignupRedirectUrl } from "@/lib/auth/redirect-url";

describe("resolveSignupRedirectUrl", () => {
  it("prefers an explicit redirect override", () => {
    const request = new Request("https://ignored.example.com/api/auth/signup");

    expect(
      resolveSignupRedirectUrl({
        request,
        fallbackAppUrl: "http://localhost:3000",
        explicitRedirectUrl: "https://kallem.vercel.app/login",
      }),
    ).toBe("https://kallem.vercel.app/login");
  });

  it("uses the public request origin when available", () => {
    const request = new Request("https://kallem.vercel.app/api/auth/signup", {
      headers: {
        origin: "https://kallem.vercel.app",
      },
    });

    expect(
      resolveSignupRedirectUrl({
        request,
        fallbackAppUrl: "http://localhost:3000",
        path: "/auth/confirm?next=/whatsapp",
      }),
    ).toBe("https://kallem.vercel.app/auth/confirm?next=/whatsapp");
  });

  it("uses forwarded host/proto when origin is missing", () => {
    const request = new Request("https://internal.example.com/api/auth/signup", {
      headers: {
        host: "internal.example.com",
        "x-forwarded-host": "kallem.vercel.app",
        "x-forwarded-proto": "https",
      },
    });

    expect(
      resolveSignupRedirectUrl({
        request,
        fallbackAppUrl: "http://localhost:3000",
        path: "/auth/confirm?next=/whatsapp",
      }),
    ).toBe("https://kallem.vercel.app/auth/confirm?next=/whatsapp");
  });

  it("falls back to the configured app URL for localhost requests", () => {
    const request = new Request("http://localhost:3000/api/auth/signup", {
      headers: {
        origin: "http://localhost:3000",
      },
    });

    expect(
      resolveSignupRedirectUrl({
        request,
        fallbackAppUrl: "http://localhost:3000",
        path: "/auth/confirm?next=/whatsapp",
      }),
    ).toBe("http://localhost:3000/auth/confirm?next=/whatsapp");
  });
});

describe("social OAuth redirect helpers", () => {
  it("builds the Supabase OAuth callback with a safe next path", () => {
    expect(buildOAuthRedirectUrl("https://kallem.vercel.app", "/dashboard")).toBe(
      "https://kallem.vercel.app/auth/callback?next=%2Fdashboard",
    );
  });

  it("falls back to connect for unsafe next paths", () => {
    expect(normalizeAuthNextPath("https://evil.example.com")).toBe("/connect");
    expect(normalizeAuthNextPath("//evil.example.com")).toBe("/connect");
    expect(buildOAuthRedirectUrl("https://kallem.vercel.app/", "//evil.example.com")).toBe(
      "https://kallem.vercel.app/auth/callback?next=%2Fconnect",
    );
  });
});
