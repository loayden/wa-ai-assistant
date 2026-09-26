import { MessageStatus } from "@prisma/client";
import * as Sentry from "@sentry/nextjs";

import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess, jsonValidationError } from "@/lib/api/response";
import { whatsappClient } from "@/lib/api/whatsapp";
import {
  inferWebhookEventType,
  inferWebhookProviderEventId,
  markWebhookEventProcessed,
  recordWebhookEvent,
} from "@/lib/observability/webhook-events";
import { prisma } from "@/lib/prisma/client";
import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";
import { checkRateLimit, getRequestRateLimitKey } from "@/lib/utils/rateLimit";
import { inboundWebhookSchema } from "@/lib/validators/message";
import { webhookVerifySchema } from "@/lib/validators/whatsapp";
import { processInboundMessage, type WebhookProcessingResult } from "@/lib/whatsapp/pipeline/processor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = webhookVerifySchema.safeParse(Object.fromEntries(searchParams));

  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  const storedConnection = await prisma.whatsAppConnection.findFirst({
    where: { webhookVerifyToken: parsed.data["hub.verify_token"] },
    select: { id: true },
  });

  if (parsed.data["hub.verify_token"] !== appEnv.WHATSAPP_VERIFY_TOKEN && !storedConnection) {
    return new Response("Forbidden", { status: 403 });
  }

  return new Response(parsed.data["hub.challenge"], { status: 200 });
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit({
    key: getRequestRateLimitKey(request, "webhook:whatsapp"),
    limit: 300,
    windowMs: 60_000,
    context: "api.webhooks.whatsapp",
  });

  if (!rateLimit.allowed) {
    return jsonError("Too many webhook requests.", 429, {
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });
  }

  const rawPayload = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!whatsappClient.verifyWebhookSignature(rawPayload, signature)) {
    return jsonError("Invalid WhatsApp webhook signature.", 403);
  }

  let payload: unknown;

  try {
    payload = JSON.parse(rawPayload);
  } catch (error) {
    logger.warn("api.webhooks.whatsapp", "Invalid WhatsApp webhook JSON payload.", { error });
    return jsonError("Invalid JSON payload.", 400);
  }

  const parsed = inboundWebhookSchema.safeParse(payload);

  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  const webhookEventId = await recordWebhookEvent({
    provider: "whatsapp",
    eventType: inferWebhookEventType("whatsapp", parsed.data),
    providerEventId: inferWebhookProviderEventId("whatsapp", parsed.data),
    rawPayload: parsed.data,
  });
  const results: WebhookProcessingResult[] = [];

  try {
    const messagePromises: Promise<WebhookProcessingResult>[] = [];

    for (const entry of parsed.data.entry) {
      for (const change of entry.changes) {
        for (const message of change.value.messages) {
          messagePromises.push(
            processInboundMessage({
              phoneNumberId: change.value.metadata.phone_number_id,
              displayPhoneNumber: change.value.metadata.display_phone_number,
              message,
            }).catch((error) => {
              logger.error("api.webhooks.whatsapp", "Concurrent message processing failed.", {
                error,
                waMessageId: message.id,
              });
              return {
                waMessageId: message.id,
                status: MessageStatus.FAILED,
              };
            })
          );
        }
      }
    }

    const settled = await Promise.allSettled(messagePromises);
    for (const outcome of settled) {
      if (outcome.status === "fulfilled") {
        results.push(outcome.value);
      }
    }

    await markWebhookEventProcessed(webhookEventId);
    return jsonSuccess({ processed: results });
  } catch (error) {
    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.webhooks.whatsapp", error);

    if (databaseErrorResponse) {
      await markWebhookEventProcessed(webhookEventId, "WHATSAPP_WEBHOOK_DATABASE_UNAVAILABLE");
      return databaseErrorResponse;
    }

    Sentry.captureException(error, {
      extra: { source: "whatsapp_webhook" },
      level: "error",
    });
    await markWebhookEventProcessed(webhookEventId, "WHATSAPP_WEBHOOK_PROCESSING_FAILED");
    logger.error("api.webhooks.whatsapp", "WhatsApp webhook processing failed.", { error });
    return jsonError("WhatsApp webhook processing failed.", 500);
  }
}
