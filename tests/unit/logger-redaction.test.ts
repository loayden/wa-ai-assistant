// FILE: tests/unit/logger-redaction.test.ts
/*
 * [ROLE: SECURITY ENGINEER]
 * Decision: Logs are production evidence, not secret storage. This test locks
 * token redaction for nested metadata and production JSON output.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

describe("structured logger redaction", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("redacts sensitive metadata keys before writing production logs", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { logger } = await import("@/lib/utils/logger");

    logger.warn("tests.logger", "redaction check", {
      accessToken: "raw-access-token",
      safeValue: "visible",
      nested: {
        clientSecret: "raw-client-secret",
        authorization: "Bearer raw-authorization",
      },
      error: new Error("safe error message"),
    });

    expect(warnSpy).toHaveBeenCalledOnce();

    const rawRecord = String(warnSpy.mock.calls[0]?.[0]);
    const record = JSON.parse(rawRecord) as {
      metadata: {
        accessToken: string;
        safeValue: string;
        nested: {
          clientSecret: string;
          authorization: string;
        };
        error: {
          message: string;
          stack?: string;
        };
      };
    };

    expect(rawRecord).not.toContain("raw-access-token");
    expect(rawRecord).not.toContain("raw-client-secret");
    expect(rawRecord).not.toContain("raw-authorization");
    expect(record.metadata.accessToken).toBe("[redacted]");
    expect(record.metadata.nested.clientSecret).toBe("[redacted]");
    expect(record.metadata.nested.authorization).toBe("[redacted]");
    expect(record.metadata.safeValue).toBe("visible");
    expect(record.metadata.error.message).toBe("safe error message");
    expect(record.metadata.error.stack).toBeUndefined();
  });
});
