import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { middleware } from "@/middleware";

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
    expect(csp).not.toContain("https://www.googletagmanager.com");
    expect(csp).not.toContain("https://www.google-analytics.com");
    expect(csp).not.toContain("script-src-elem");
    expect(csp).not.toContain("style-src-elem");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp?.match(/script-src[^;]*/)?.[0]).not.toContain("'unsafe-inline'");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });
});
