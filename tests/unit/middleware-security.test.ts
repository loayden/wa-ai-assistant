import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { middleware } from "@/middleware";

describe("security middleware", () => {
  it("adds a nonce-based CSP without unsafe inline/eval in non-development environments", async () => {
    const response = await middleware(new NextRequest("https://kallem.vercel.app/login"));
    const csp = response.headers.get("content-security-policy");

    expect(csp).toContain("script-src 'self' 'nonce-");
    expect(csp).toContain("style-src 'self' 'nonce-");
    expect(csp).not.toContain("'unsafe-inline'");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });
});

