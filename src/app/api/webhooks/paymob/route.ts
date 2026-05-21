// FILE: src/app/api/webhooks/paymob/route.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Paymob webhooks are trusted only after HMAC verification, then they
 * update the local plan state from the checkout reference created by kallem.
 */
import { PlanTier, SubscriptionStatus } from "@prisma/client";

import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess } from "@/lib/api/response";
import { parsePaymobReference, verifyPaymobTransactionHmac } from "@/lib/paymob/client";
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseBody(bodyText: string): UnknownRecord {
  if (!bodyText.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(bodyText) as unknown;
    return isRecord(parsed) ? parsed : {};
  } catch {
    return Object.fromEntries(new URLSearchParams(bodyText));
  }
}

function getNestedValue(record: UnknownRecord, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!isRecord(current)) {
      return undefined;
    }

    return current[key];
  }, record);
}

function getNestedString(record: UnknownRecord, paths: string[]): string | null {
  for (const path of paths) {
    const value = getNestedValue(record, path);

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }

    if (typeof value === "number") {
      return String(value);
    }
  }

  return null;
}

function getNestedRecord(record: UnknownRecord, paths: string[]): UnknownRecord | null {
  for (const path of paths) {
    const value = getNestedValue(record, path);

    if (isRecord(value)) {
      return value;
    }
  }

  return null;
}

function getNestedBoolean(record: UnknownRecord, paths: string[]): boolean | null {
  for (const path of paths) {
    const value = getNestedValue(record, path);

    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "string") {
      if (value.toLowerCase() === "true") {
        return true;
      }

      if (value.toLowerCase() === "false") {
        return false;
      }
    }
  }

  return null;
}

function getAmount(record: UnknownRecord): number | null {
  const value = getNestedValue(record, "amount_cents") ?? getNestedValue(record, "amount");

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function getTransactionRecord(payload: UnknownRecord): UnknownRecord {
  const obj = getNestedRecord(payload, ["obj"]);
  return obj ?? payload;
}

function getWebhookReference(payload: UnknownRecord, transaction: UnknownRecord): string | null {
  return (
    getNestedString(payload, [
      "special_reference",
      "obj.special_reference",
      "order.special_reference",
      "obj.order.special_reference",
      "merchant_order_id",
      "obj.merchant_order_id",
      "order.merchant_order_id",
      "obj.order.merchant_order_id",
    ]) ??
    getNestedString(transaction, [
      "special_reference",
      "order.special_reference",
      "merchant_order_id",
      "order.merchant_order_id",
    ])
  );
}

function getWebhookPlan(payload: UnknownRecord, transaction: UnknownRecord): Extract<PlanTier, "PRO" | "BUSINESS"> | null {
  const extras = getNestedRecord(payload, ["extras", "obj.extras", "payment_key_claims.extra", "obj.payment_key_claims.extra"]) ??
    getNestedRecord(transaction, ["extras", "payment_key_claims.extra"]);
  const plan = extras ? getNestedString(extras, ["planTier", "plan_tier", "plan"]) : null;

  if (plan === PlanTier.PRO || plan === PlanTier.BUSINESS) {
    return plan;
  }

  return null;
}

function getWebhookUserId(payload: UnknownRecord, transaction: UnknownRecord): string | null {
  const extras = getNestedRecord(payload, ["extras", "obj.extras", "payment_key_claims.extra", "obj.payment_key_claims.extra"]) ??
    getNestedRecord(transaction, ["extras", "payment_key_claims.extra"]);

  return extras ? getNestedString(extras, ["userId", "user_id"]) : null;
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const payload = parseBody(await request.text());
  const transaction = getTransactionRecord(payload);
  const hmac = url.searchParams.get("hmac") ?? getNestedString(payload, ["hmac", "obj.hmac"]);

  if (!verifyPaymobTransactionHmac(transaction, hmac)) {
    logger.warn("api.webhooks.paymob", "Invalid Paymob webhook HMAC.", {
      hasHmac: Boolean(hmac),
      eventId: getNestedString(transaction, ["id"]),
    });
    return jsonError("Invalid Paymob webhook signature.", 400);
  }

  const reference = getWebhookReference(payload, transaction);
  const parsedReference = parsePaymobReference(reference);
  const eventId = reference ?? `paymob:${getNestedString(transaction, ["id"]) ?? Date.now().toString()}`;
  const success = getNestedBoolean(transaction, ["success"]) === true;
  const pending = getNestedBoolean(transaction, ["pending"]) === true;
  const status = success ? SubscriptionStatus.ACTIVE : pending ? "PENDING" : "FAILED";

  try {
    const existingEvent = await prisma.subscriptionEvent.findUnique({
      where: { paymentEventId: eventId },
    });
    const userId = parsedReference?.userId ?? getWebhookUserId(payload, transaction) ?? existingEvent?.userId;
    const planTier = parsedReference?.planTier ?? getWebhookPlan(payload, transaction) ?? existingEvent?.planTier;

    if (!userId || !planTier || planTier === PlanTier.FREE) {
      logger.warn("api.webhooks.paymob", "Paymob webhook did not match a local checkout reference.", {
        eventId,
        reference,
      });
      return jsonSuccess({ received: true, ignored: true });
    }

    await prisma.$transaction(async (tx) => {
      await tx.subscriptionEvent.upsert({
        where: { paymentEventId: eventId },
        update: {
          status,
          amount: getAmount(transaction),
          currency: getNestedString(transaction, ["currency"]),
        },
        create: {
          userId,
          paymentEventId: eventId,
          eventType: "paymob.transaction.processed",
          planTier,
          status,
          amount: getAmount(transaction),
          currency: getNestedString(transaction, ["currency"]),
        },
      });

      if (success) {
        await tx.user.update({
          where: { id: userId },
          data: {
            planTier,
            subscriptionStatus: SubscriptionStatus.ACTIVE,
            paymentSubscriptionId: reference,
          },
        });
      }
    });

    return jsonSuccess({ received: true });
  } catch (error) {
    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.webhooks.paymob", error);

    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }

    logger.error("api.webhooks.paymob", "Paymob webhook processing failed.", { error, eventId });
    return jsonError("Paymob webhook processing failed.", 500);
  }
}
