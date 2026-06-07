// FILE: tests/unit/cron-security.test.ts
/*
 * [ROLE: SECURITY ENGINEER]
 * Decision: Cron authorization is production-sensitive, so tests cover missing,
 * invalid, malformed, and valid secret behavior explicitly.
 */
import { describe, expect, it } from "vitest";

import { isAuthorizedCronRequest } from "@/lib/security/cron";

function makeCronRequest(authorization?: string) {
  return new Request("https://kallem.test/api/cron/process-outbox", {
    headers: authorization ? { authorization } : {},
  });
}

describe("cron authorization", () => {
  it("rejects production cron requests when no secret is configured", () => {
    expect(isAuthorizedCronRequest(makeCronRequest(), { secret: undefined, nodeEnv: "production" })).toBe(false);
  });

  it("allows local and test cron requests when no secret is configured", () => {
    expect(isAuthorizedCronRequest(makeCronRequest(), { secret: undefined, nodeEnv: "test" })).toBe(true);
    expect(isAuthorizedCronRequest(makeCronRequest(), { secret: undefined, nodeEnv: "development" })).toBe(true);
  });

  it("accepts the exact bearer secret", () => {
    expect(isAuthorizedCronRequest(makeCronRequest("Bearer cron-secret"), { secret: "cron-secret", nodeEnv: "production" })).toBe(
      true,
    );
  });

  it("rejects missing, malformed, and wrong bearer secrets", () => {
    const options = { secret: "cron-secret", nodeEnv: "production" as const };

    expect(isAuthorizedCronRequest(makeCronRequest(), options)).toBe(false);
    expect(isAuthorizedCronRequest(makeCronRequest("Basic cron-secret"), options)).toBe(false);
    expect(isAuthorizedCronRequest(makeCronRequest("Bearer wrong-secret"), options)).toBe(false);
  });
});
