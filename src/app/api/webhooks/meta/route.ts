import { after } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { processSocialWebhook } from "@/lib/channels/social-processing";
import { verifyMetaSignature } from "@/lib/meta/signature";
import {
  inferWebhookEventType,
  inferWebhookProviderEventId,
  markWebhookEventProcessed,
  recordWebhookEvent,
} from "@/lib/observability/webhook-events";
import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";
import { checkRateLimit, getRequestRateLimitKey } from "@/lib/utils/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  const validTokens = new Set([appEnv.META_VERIFY_TOKEN, appEnv.WHATSAPP_VERIFY_TOKEN].filter(Boolean));

  if (mode === "subscribe" && token && validTokens.has(token) && challenge) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit({
    key: getRequestRateLimitKey(request, "webhook:meta"),
    limit: 300,
    windowMs: 60_000,
    context: "api.webhooks.meta",
  });

  if (!rateLimit.allowed) {
    return Response.json({ error: "Too many webhook requests." }, { status: 429 });
  }

  const rawBody = await request.text();

  if (!verifyMetaSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: { object?: string; entry?: unknown[] };

  try {
    body = JSON.parse(rawBody) as { object?: string; entry?: unknown[] };
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const webhookEventId = await recordWebhookEvent({
    provider: "meta",
    eventType: inferWebhookEventType("meta", body),
    providerEventId: inferWebhookProviderEventId("meta", body),
    rawPayload: body,
  });

  after(async () => {
    try {
      await processSocialWebhook(body);
      await markWebhookEventProcessed(webhookEventId);
    } catch (error) {
      await markWebhookEventProcessed(webhookEventId, "SOCIAL_WEBHOOK_PROCESSING_FAILED");
      Sentry.captureException(error, {
        tags: { source: "meta_social_webhook" },
      });
      logger.error("api.webhooks.meta", "Meta social webhook processing failed.", { error });
    }
  });

  return Response.json({ received: true });
}
