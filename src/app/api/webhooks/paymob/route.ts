// FILE: src/app/api/webhooks/paymob/route.ts
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess } from "@/lib/api/response";
import { getPaymobCallbackHmac, parsePaymobCallbackBody, PaymobWebhookSignatureError, processPaymobCallback } from "@/lib/paymob/webhook";
import { logger } from "@/lib/utils/logger";

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
  const url = new URL(request.url);
  const payload = parsePaymobCallbackBody(await request.text());
  const hmac = getPaymobCallbackHmac(payload, url.searchParams);

  try {
    const result = await processPaymobCallback({
      payload,
      hmac,
      context: "api.webhooks.paymob",
    });

    return jsonSuccess(result);
  } catch (error) {
    if (error instanceof PaymobWebhookSignatureError) {
      return jsonError(error.message, 400);
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.webhooks.paymob", error);

    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }

    logger.error("api.webhooks.paymob", "Paymob webhook processing failed.", { error });
    return jsonError("Paymob webhook processing failed.", 500);
  }
}
