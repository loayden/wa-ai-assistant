import { describe, expect, it } from "vitest";

import { buildOutboundAttemptMetadata, classifyOutboundFailure } from "@/lib/reliability/outbound";

describe("outbound reliability helpers", () => {
  it("classifies Meta test recipient blocking as non-retryable setup work", () => {
    const failure = classifyOutboundFailure({
      channel: "whatsapp",
      error: {
        status: 400,
        response: {
          error: {
            code: 131030,
            message: "Recipient not in allowed list",
          },
        },
      },
    });

    expect(failure.code).toBe("meta_test_recipient_blocked");
    expect(failure.retry.canRetry).toBe(false);
    expect(failure.actionHref).toBe("/connect");
    expect(failure.userMessage).toContain("رقم Meta الاختباري");
  });

  it("marks rate limits as retryable transient failures", () => {
    const failure = classifyOutboundFailure({
      channel: "messenger",
      error: {
        status: 429,
        response: {
          error: {
            code: 613,
            message: "Calls to this api have exceeded the rate limit.",
          },
        },
      },
    });

    expect(failure.code).toBe("rate_limited");
    expect(failure.retry).toEqual({ canRetry: true, reason: "transient" });
  });

  it("builds JSON-safe outbound attempt metadata", () => {
    const failure = classifyOutboundFailure({ channel: "instagram", providerError: "timeout" });
    const metadata = buildOutboundAttemptMetadata({
      channel: "instagram",
      direction: "manual",
      stage: "failed",
      failure,
    });

    expect(metadata).toEqual(
      expect.objectContaining({
        version: "outbound-attempt-v1",
        channel: "instagram",
        direction: "manual",
        stage: "failed",
        failure: expect.objectContaining({ code: "network_error" }),
      }),
    );
    expect(JSON.parse(JSON.stringify(metadata))).toEqual(metadata);
  });
});

