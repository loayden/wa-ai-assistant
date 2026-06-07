// FILE: src/lib/observability/webhook-events.ts
/*
 * [ROLE: SRE ENGINEER]
 * Decision: Provider webhooks need durable processing evidence so production
 * failures can be diagnosed even when provider retries hide the first error.
 */
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/utils/logger";
import { toObservabilityJson } from "@/lib/observability/redaction";

type WebhookProvider = "meta" | "whatsapp" | "paymob";

type RecordWebhookEventInput = {
  provider: WebhookProvider;
  eventType: string;
  providerEventId?: string | null;
  rawPayload: unknown;
};

type PrismaWithWebhookEvent = typeof prisma & {
  webhookEvent?: {
    create: (args: {
      data: {
        provider: string;
        eventType: string;
        providerEventId?: string | null;
        rawPayload: ReturnType<typeof toObservabilityJson>;
      };
    }) => Promise<{ id: string }>;
    upsert: (args: {
      where: {
        provider_providerEventId: {
          provider: string;
          providerEventId: string;
        };
      };
      update: {
        eventType: string;
        rawPayload: ReturnType<typeof toObservabilityJson>;
      };
      create: {
        provider: string;
        eventType: string;
        providerEventId: string;
        rawPayload: ReturnType<typeof toObservabilityJson>;
      };
    }) => Promise<{ id: string }>;
    update: (args: {
      where: { id: string };
      data: {
        processed?: boolean;
        processedAt?: Date | null;
        failureReason?: string | null;
      };
    }) => Promise<unknown>;
  };
};

function firstString(values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return null;
}

function objectPath(value: unknown, path: Array<string | number>): unknown {
  let current = value;

  for (const part of path) {
    if (typeof part === "number") {
      if (!Array.isArray(current)) {
        return undefined;
      }
      current = current[part];
      continue;
    }

    if (current === null || typeof current !== "object") {
      return undefined;
    }

    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

export function inferWebhookEventType(provider: WebhookProvider, payload: unknown): string {
  if (provider === "paymob") {
    return firstString([objectPath(payload, ["type"]), objectPath(payload, ["obj", "type"]), objectPath(payload, ["obj", "transaction", "type"])]) ?? "payment";
  }

  if (provider === "whatsapp") {
    return firstString([
      objectPath(payload, ["entry", 0, "changes", 0, "field"]),
      objectPath(payload, ["entry", 0, "changes", 0, "value", "messages", 0, "type"]),
      objectPath(payload, ["object"]),
    ]) ?? "message";
  }

  return firstString([
    objectPath(payload, ["entry", 0, "changes", 0, "field"]),
    objectPath(payload, ["entry", 0, "messaging", 0, "message", "mid"]),
    objectPath(payload, ["object"]),
  ]) ?? "social_event";
}

export function inferWebhookProviderEventId(provider: WebhookProvider, payload: unknown): string | null {
  if (provider === "paymob") {
    return firstString([
      objectPath(payload, ["obj", "id"]),
      objectPath(payload, ["id"]),
      objectPath(payload, ["transaction_id"]),
      objectPath(payload, ["order", "id"]),
    ]);
  }

  if (provider === "whatsapp") {
    return firstString([
      objectPath(payload, ["entry", 0, "changes", 0, "value", "messages", 0, "id"]),
      objectPath(payload, ["entry", 0, "changes", 0, "value", "statuses", 0, "id"]),
    ]);
  }

  return firstString([
    objectPath(payload, ["entry", 0, "messaging", 0, "message", "mid"]),
    objectPath(payload, ["entry", 0, "changes", 0, "value", "message", "mid"]),
    objectPath(payload, ["entry", 0, "id"]),
  ]);
}

export async function recordWebhookEvent(input: RecordWebhookEventInput): Promise<string | null> {
  try {
    const webhookEvent = (prisma as PrismaWithWebhookEvent).webhookEvent;

    if (!webhookEvent) {
      logger.warn("observability.webhookEvent", "Webhook event model is not generated yet; skipped event write.", {
        provider: input.provider,
        eventType: input.eventType,
      });
      return null;
    }

    const baseData = {
      provider: input.provider,
      eventType: input.eventType,
      rawPayload: toObservabilityJson(input.rawPayload),
    };

    const event = input.providerEventId
      ? await webhookEvent.upsert({
          where: {
            provider_providerEventId: {
              provider: input.provider,
              providerEventId: input.providerEventId,
            },
          },
          update: baseData,
          create: {
            ...baseData,
            providerEventId: input.providerEventId,
          },
        })
      : await webhookEvent.create({
          data: {
            ...baseData,
            providerEventId: null,
          },
        });

    return event.id;
  } catch (error) {
    logger.warn("observability.webhookEvent", "Webhook event write failed without blocking webhook.", {
      error,
      provider: input.provider,
      eventType: input.eventType,
    });
    return null;
  }
}

export async function markWebhookEventProcessed(eventId: string | null, failureReason?: string | null): Promise<void> {
  if (!eventId) {
    return;
  }

  try {
    const webhookEvent = (prisma as PrismaWithWebhookEvent).webhookEvent;

    if (!webhookEvent) {
      return;
    }

    await webhookEvent.update({
      where: { id: eventId },
      data: {
        processed: !failureReason,
        processedAt: new Date(),
        failureReason: failureReason ?? null,
      },
    });
  } catch (error) {
    logger.warn("observability.webhookEvent", "Webhook event status update failed without blocking webhook.", {
      error,
      eventId,
      failureReason,
    });
  }
}
