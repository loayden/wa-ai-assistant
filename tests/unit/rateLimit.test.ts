// FILE: tests/unit/rateLimit.test.ts
/*
 * [ROLE: QA ENGINEER]
 * Decision: Rate limiting is security-sensitive, so tests lock the allowed,
 * blocked, and reset behavior without depending on wall-clock delays.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { checkRateLimit, clearRateLimitBuckets } from "@/lib/utils/rateLimit";

describe("rate limit utilities", () => {
  afterEach(() => {
    clearRateLimitBuckets();
    vi.useRealTimers();
  });

  it("allows requests up to the configured limit", () => {
    const first = checkRateLimit({ key: "auth:login:test", limit: 2, windowMs: 60_000, context: "tests.rateLimit" });
    const second = checkRateLimit({ key: "auth:login:test", limit: 2, windowMs: 60_000, context: "tests.rateLimit" });

    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(1);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);
  });

  it("blocks requests over the configured limit", () => {
    checkRateLimit({ key: "auth:signup:test", limit: 1, windowMs: 60_000, context: "tests.rateLimit" });
    const blocked = checkRateLimit({ key: "auth:signup:test", limit: 1, windowMs: 60_000, context: "tests.rateLimit" });

    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("resets the bucket after the window expires", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-05T00:00:00.000Z"));

    checkRateLimit({ key: "auth:login:reset", limit: 1, windowMs: 1_000, context: "tests.rateLimit" });
    expect(
      checkRateLimit({ key: "auth:login:reset", limit: 1, windowMs: 1_000, context: "tests.rateLimit" }).allowed,
    ).toBe(false);

    vi.setSystemTime(new Date("2026-05-05T00:00:01.001Z"));

    expect(
      checkRateLimit({ key: "auth:login:reset", limit: 1, windowMs: 1_000, context: "tests.rateLimit" }).allowed,
    ).toBe(true);
  });
});
