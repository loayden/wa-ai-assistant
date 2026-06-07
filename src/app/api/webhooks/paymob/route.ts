// FILE: src/app/api/webhooks/paymob/route.ts
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess } from "@/lib/api/response";
import {
  inferWebhookEventType,
  inferWebhookProviderEventId,
  markWebhookEventProcessed,
  recordWebhookEvent,
} from "@/lib/observability/webhook-events";
import { getPaymobCallbackHmac, parsePaymobCallbackBody, PaymobWebhookSignatureError, processPaymobCallback } from "@/lib/paymob/webhook";
import { logger } from "@/lib/utils/logger";
import { checkRateLimit, getRequestRateLimitKey } from "@/lib/utils/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(): Response {
  return Response.json(
    {
      status: "ready",
      provider: "paymob",
      method: "POST",
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit({
    key: getRequestRateLimitKey(request, "webhook:paymob"),
    limit: 120,
    windowMs: 60_000,
    context: "api.webhooks.paymob",
  });

  if (!rateLimit.allowed) {
    return jsonError("Too many webhook requests.", 429, {
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });
  }

  const url = new URL(request.url);
  const payload = parsePaymobCallbackBody(await request.text());
  const hmac = getPaymobCallbackHmac(payload, url.searchParams);
  const webhookEventId = await recordWebhookEvent({
    provider: "paymob",
    eventType: inferWebhookEventType("paymob", payload),
    providerEventId: inferWebhookProviderEventId("paymob", payload),
    rawPayload: payload,
  });

  try {
    const result = await processPaymobCallback({
      payload,
      hmac,
      context: "api.webhooks.paymob",
    });

    await markWebhookEventProcessed(webhookEventId);
    return jsonSuccess(result);
  } catch (error) {
    if (error instanceof PaymobWebhookSignatureError) {
      await markWebhookEventProcessed(webhookEventId, "PAYMOB_INVALID_SIGNATURE");
      return jsonError(error.message, 400);
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.webhooks.paymob", error);

    if (databaseErrorResponse) {
      await markWebhookEventProcessed(webhookEventId, "PAYMOB_WEBHOOK_DATABASE_UNAVAILABLE");
      return databaseErrorResponse;
    }

    await markWebhookEventProcessed(webhookEventId, "PAYMOB_WEBHOOK_PROCESSING_FAILED");
    logger.error("api.webhooks.paymob", "Paymob webhook processing failed.", { error });
    return jsonError("Paymob webhook processing failed.", 500);
  }
}
