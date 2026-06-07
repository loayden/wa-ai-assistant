// FILE: src/lib/security/public-env-audit.ts
/*
 * [ROLE: SECURITY ENGINEER]
 * Decision: Public browser environment variables must be intentionally
 * allowlisted because every NEXT_PUBLIC_ value is shipped to the client.
 */

export type PublicEnvAuditViolation = {
  key: string;
  reason: "not_allowlisted" | "suspicious_secret_name";
};

export type PublicEnvAuditResult = {
  safe: boolean;
  publicKeys: string[];
  violations: PublicEnvAuditViolation[];
};

export const ALLOWED_PUBLIC_ENV_KEYS = new Set([
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_META_APP_ID",
  "NEXT_PUBLIC_SENTRY_DSN",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
]);

const SUSPICIOUS_PUBLIC_SECRET_PATTERN =
  /SECRET|SERVICE_ROLE|DATABASE|DIRECT_URL|PRIVATE|PASSWORD|HMAC|ACCESS_TOKEN|REFRESH_TOKEN|CLIENT_SECRET/i;

export function auditPublicEnvironment(env: Record<string, string | undefined> = process.env): PublicEnvAuditResult {
  const publicKeys = Object.keys(env)
    .filter((key) => key.startsWith("NEXT_PUBLIC_"))
    .sort();
  const violations: PublicEnvAuditViolation[] = [];

  for (const key of publicKeys) {
    if (SUSPICIOUS_PUBLIC_SECRET_PATTERN.test(key)) {
      violations.push({ key, reason: "suspicious_secret_name" });
      continue;
    }

    if (!ALLOWED_PUBLIC_ENV_KEYS.has(key)) {
      violations.push({ key, reason: "not_allowlisted" });
    }
  }

  return {
    safe: violations.length === 0,
    publicKeys,
    violations,
  };
}
