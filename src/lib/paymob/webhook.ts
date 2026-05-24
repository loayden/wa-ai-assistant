// FILE: src/lib/paymob/webhook.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Paymob can notify kallem through a server webhook and also return
 * customers through a callback URL. Both entry points share one verifier and
 * plan-update path so payment state stays idempotent.
 */
import "server-only";

import { MessageDirection, MessageStatus, PlanTier, SubscriptionStatus } from "@prisma/client";

import { whatsappClient } from "@/lib/api/whatsapp";
import { getPaymobPlanAmountCents, parsePaymobReference, verifyPaymobTransactionHmac } from "@/lib/paymob/client";
import { parseOrderPaymentReference } from "@/lib/paymob/order-payment";
import { prisma } from "@/lib/prisma/client";
import { decrypt } from "@/lib/utils/encryption";
import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";

export type UnknownRecord = Record<string, unknown>;

export class PaymobWebhookSignatureError extends Error {
  constructor(message = "Invalid Paymob webhook signature.") {
    super(message);
    this.name = "PaymobWebhookSignatureError";
  }
}

export type PaymobCallbackResult = {
  received: true;
  ignored?: boolean;
  success: boolean;
  pending: boolean;
  eventId: string;
  reference: string | null;
  planTier?: Extract<PlanTier, "PRO" | "BUSINESS">;
  userId?: string;
};

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseRecordString(value: string): UnknownRecord | null {
  const trimmed = value.trim();

  if (!trimmed.startsWith("{")) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function parsePaymobCallbackBody(bodyText: string): UnknownRecord {
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

export function parsePaymobCallbackSearchParams(searchParams: URLSearchParams): UnknownRecord {
  return Object.fromEntries(searchParams);
}

function getNestedValue(record: UnknownRecord, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!isRecord(current)) {
      return undefined;
    }

    const value = current[key];

    if (typeof value === "string") {
      return parseRecordString(value) ?? value;
    }

    return value;
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

function moneyMatches(record: UnknownRecord, expectedAmount: number, expectedCurrency: string): boolean {
  const amount = getAmount(record);
  const currency = getNestedString(record, ["currency"]);

  return amount === expectedAmount && currency === expectedCurrency;
}

function getTransactionRecord(payload: UnknownRecord): UnknownRecord {
  const obj = getNestedRecord(payload, ["obj"]);
  return obj ?? payload;
}

function getCallbackReference(payload: UnknownRecord, transaction: UnknownRecord): string | null {
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

function getCallbackExtras(payload: UnknownRecord, transaction: UnknownRecord): UnknownRecord | null {
  return (
    getNestedRecord(payload, ["extras", "obj.extras", "payment_key_claims.extra", "obj.payment_key_claims.extra"]) ??
    getNestedRecord(transaction, ["extras", "payment_key_claims.extra"])
  );
}

function getCallbackPlan(payload: UnknownRecord, transaction: UnknownRecord): Extract<PlanTier, "PRO" | "BUSINESS"> | null {
  const extras = getCallbackExtras(payload, transaction);
  const plan = extras ? getNestedString(extras, ["planTier", "plan_tier", "plan"]) : null;

  if (plan === PlanTier.PRO || plan === PlanTier.BUSINESS) {
    return plan;
  }

  return null;
}

function getCallbackUserId(payload: UnknownRecord, transaction: UnknownRecord): string | null {
  const extras = getCallbackExtras(payload, transaction);
  return extras ? getNestedString(extras, ["userId", "user_id"]) : null;
}

export function getPaymobCallbackHmac(payload: UnknownRecord, searchParams?: URLSearchParams): string | null {
  return searchParams?.get("hmac") ?? getNestedString(payload, ["hmac", "obj.hmac"]);
}

export async function processPaymobCallback(params: {
  payload: UnknownRecord;
  hmac: string | null;
  context: string;
}): Promise<PaymobCallbackResult> {
  const transaction = getTransactionRecord(params.payload);

  if (!verifyPaymobTransactionHmac(transaction, params.hmac)) {
    logger.warn(params.context, "Invalid Paymob callback HMAC.", {
      hasHmac: Boolean(params.hmac),
      eventId: getNestedString(transaction, ["id"]),
    });
    throw new PaymobWebhookSignatureError();
  }

  const reference = getCallbackReference(params.payload, transaction);
  const parsedReference = parsePaymobReference(reference);
  const parsedOrderReference = parseOrderPaymentReference(reference);
  const eventId = reference ?? `paymob:${getNestedString(transaction, ["id"]) ?? Date.now().toString()}`;
  const success = getNestedBoolean(transaction, ["success"]) === true;
  const pending = getNestedBoolean(transaction, ["pending"]) === true;
  const status = success ? SubscriptionStatus.ACTIVE : pending ? "PENDING" : "FAILED";

  if (parsedOrderReference) {
    const order = await prisma.order.findUnique({
      where: {
        id: parsedOrderReference.orderId,
      },
      include: {
        connection: true,
      },
    });

    if (!order) {
      logger.warn(params.context, "Paymob callback matched an order reference that no longer exists.", {
        eventId,
        reference,
        orderId: parsedOrderReference.orderId,
      });

      return {
        received: true,
        ignored: true,
        success,
        pending,
        eventId,
        reference,
      };
    }

    if (success && !moneyMatches(transaction, order.subtotal, appEnv.PAYMOB_CURRENCY)) {
      logger.warn(params.context, "Paymob order callback had a valid HMAC but did not match the local order amount or currency.", {
        eventId,
        reference,
        orderId: order.id,
      });

      return {
        received: true,
        ignored: true,
        success,
        pending,
        eventId,
        reference,
        userId: order.userId,
      };
    }

    if (success && !order.paidAt) {
      const paidAt = new Date();
      await prisma.order.update({
        where: {
          id: order.id,
        },
        data: {
          paidAt,
        },
      });

      if (order.connection.isActive) {
        const receiptText = "✅ تم استلام دفعتك! شكراً 🎉";

        try {
          const sendResponse = await whatsappClient.sendMessage(order.connection.phoneNumberId, order.customerPhone, receiptText, {
            accessToken: appEnv.WHATSAPP_MOCK_MODE ? undefined : decrypt(order.connection.accessToken),
          });
          const outboundWaMessageId = sendResponse.messages[0]?.id;

          if (outboundWaMessageId) {
            await prisma.message.create({
              data: {
                userId: order.userId,
                connectionId: order.connectionId,
                waMessageId: outboundWaMessageId,
                direction: MessageDirection.OUTBOUND,
                fromNumber: order.connection.phoneNumberId,
                toNumber: order.customerPhone,
                bodyText: receiptText,
                status: MessageStatus.REPLIED,
                aiModelUsed: "order-payment-receipt",
                processedAt: paidAt,
              },
            });
          }
        } catch (error) {
          logger.warn(params.context, "Order payment was marked paid but WhatsApp receipt failed.", {
            error,
            eventId,
            orderId: order.id,
          });
        }
      }
    }

    return {
      received: true,
      success,
      pending,
      eventId,
      reference,
      userId: order.userId,
    };
  }

  const existingEvent = await prisma.subscriptionEvent.findUnique({
    where: { paymentEventId: eventId },
  });
  const userId = parsedReference?.userId ?? getCallbackUserId(params.payload, transaction) ?? existingEvent?.userId;
  const planTier = parsedReference?.planTier ?? getCallbackPlan(params.payload, transaction) ?? existingEvent?.planTier;

  if (!userId || !planTier || planTier === PlanTier.FREE) {
    logger.warn(params.context, "Paymob callback did not match a local checkout reference.", {
      eventId,
      reference,
    });

    return {
      received: true,
      ignored: true,
      success,
      pending,
      eventId,
      reference,
    };
  }

  if (success && !moneyMatches(transaction, getPaymobPlanAmountCents(planTier), appEnv.PAYMOB_CURRENCY)) {
    logger.warn(params.context, "Paymob subscription callback had a valid HMAC but did not match the expected plan amount or currency.", {
      eventId,
      reference,
      planTier,
    });

    return {
      received: true,
      ignored: true,
      success,
      pending,
      eventId,
      reference,
      userId,
      planTier,
    };
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
          paidAt: new Date(),
          trialEndsAt: null,
        },
      });
    }
  });

  return {
    received: true,
    success,
    pending,
    eventId,
    reference,
    userId,
    planTier,
  };
}
