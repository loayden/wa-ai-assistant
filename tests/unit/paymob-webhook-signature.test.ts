// FILE: tests/unit/paymob-webhook-signature.test.ts
/*
 * [ROLE: SECURITY ENGINEER]
 * Decision: Payment webhooks must fail closed when the HMAC is missing or
 * invalid, before any subscription or order state can change.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/utils/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { PaymobWebhookSignatureError, processPaymobCallback } from "@/lib/paymob/webhook";

describe("Paymob webhook signatures", () => {
  it("rejects invalid callback HMAC values", async () => {
    await expect(
      processPaymobCallback({
        payload: {
          id: 123,
          success: true,
          pending: false,
          amount_cents: 99900,
          currency: "EGP",
        },
        hmac: "invalid-hmac",
        context: "tests.paymob",
      }),
    ).rejects.toBeInstanceOf(PaymobWebhookSignatureError);
  });
});
