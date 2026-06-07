// FILE: tests/unit/public-env-audit.test.ts
/*
 * [ROLE: SECURITY ENGINEER]
 * Decision: Public env checks should fail closed when a browser-exposed key
 * looks like a secret or has not been reviewed.
 */
import { describe, expect, it } from "vitest";

import { auditPublicEnvironment } from "@/lib/security/public-env-audit";

describe("public environment audit", () => {
  it("allows reviewed browser-safe public keys", () => {
    const result = auditPublicEnvironment({
      NEXT_PUBLIC_APP_URL: "https://kallem.vercel.app",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
      NEXT_PUBLIC_META_APP_ID: "123",
      NEXT_PUBLIC_SENTRY_DSN: "https://public@sentry.example/1",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_x",
    });

    expect(result.safe).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it("flags browser-exposed secret-looking keys", () => {
    const result = auditPublicEnvironment({
      NEXT_PUBLIC_APP_URL: "https://kallem.vercel.app",
      NEXT_PUBLIC_SERVICE_ROLE_KEY: "service-role",
      NEXT_PUBLIC_META_CLIENT_SECRET: "secret",
    });

    expect(result.safe).toBe(false);
    expect(result.violations).toEqual([
      { key: "NEXT_PUBLIC_META_CLIENT_SECRET", reason: "suspicious_secret_name" },
      { key: "NEXT_PUBLIC_SERVICE_ROLE_KEY", reason: "suspicious_secret_name" },
    ]);
  });

  it("flags unreviewed public keys even when they do not look secret", () => {
    const result = auditPublicEnvironment({
      NEXT_PUBLIC_EXPERIMENT_FLAG: "true",
    });

    expect(result.safe).toBe(false);
    expect(result.violations).toEqual([{ key: "NEXT_PUBLIC_EXPERIMENT_FLAG", reason: "not_allowlisted" }]);
  });
});
