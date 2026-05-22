// FILE: src/lib/paymob/client.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Paymob checkout is isolated behind one server-only client so card
 * data stays outside kallem and webhook verification remains centralized.
 */
import "server-only";

import crypto from "crypto";

import type { PlanTier } from "@prisma/client";

import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";

const PAYMOB_API_BASE_URL = "https://accept.paymob.com";

type PaymobPaymentMethod = number | string;

type CreatePaymobCheckoutParams = {
  userId: string;
  email: string;
  fullName?: string | null;
  planTier: Extract<PlanTier, "PRO" | "BUSINESS">;
};

type PaymobIntentionResponse = {
  id?: string | number;
  client_secret?: string;
  clientSecret?: string;
  intention_order_id?: string | number;
  intentionOrderId?: string | number;
};

export class PaymobConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymobConfigurationError";
  }
}

export class PaymobRequestError extends Error {
  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "PaymobRequestError";
    this.status = status;
  }
}

function getPaymentMethods(): PaymobPaymentMethod[] {
  const raw = appEnv.PAYMOB_CARD_INTEGRATION_ID?.trim();

  if (!raw) {
    throw new PaymobConfigurationError("Payment setup is missing the Paymob card integration ID. Add it in the server environment before checkout can open.");
  }

  return raw
    .split(",")
    .map((method) => method.trim())
    .filter(Boolean)
    .map((method) => (/^\d+$/.test(method) ? Number(method) : method));
}

function getPlanAmountCents(planTier: Extract<PlanTier, "PRO" | "BUSINESS">): number {
  return planTier === "BUSINESS" ? appEnv.PAYMOB_BUSINESS_AMOUNT_CENTS : appEnv.PAYMOB_PRO_AMOUNT_CENTS;
}

function splitName(fullName: string | null | undefined, email: string): { firstName: string; lastName: string } {
  const parts = fullName?.trim().split(/\s+/).filter(Boolean) ?? [];

  if (parts.length === 0) {
    const fallback = email.split("@")[0] || "kallem";
    return { firstName: fallback, lastName: "Customer" };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" ") || "Customer",
  };
}

export function createPaymobReference(params: { userId: string; planTier: Extract<PlanTier, "PRO" | "BUSINESS"> }): string {
  return `kallem:${params.userId}:${params.planTier}:${Date.now()}`;
}

export function parsePaymobReference(reference: string | null | undefined): {
  userId: string;
  planTier: Extract<PlanTier, "PRO" | "BUSINESS">;
} | null {
  const match = reference?.match(/^kallem:([0-9a-f-]{36}):(PRO|BUSINESS):\d+$/i);

  if (!match) {
    return null;
  }

  return {
    userId: match[1],
    planTier: match[2].toUpperCase() as Extract<PlanTier, "PRO" | "BUSINESS">,
  };
}

export async function createPaymobCheckoutSession(params: CreatePaymobCheckoutParams): Promise<{
  url: string;
  reference: string;
  intentionId: string;
  amountCents: number;
  currency: string;
}> {
  const amountCents = getPlanAmountCents(params.planTier);
  const reference = createPaymobReference({ userId: params.userId, planTier: params.planTier });
  const { firstName, lastName } = splitName(params.fullName, params.email);

  const payload = {
    amount: amountCents,
    currency: appEnv.PAYMOB_CURRENCY,
    payment_methods: getPaymentMethods(),
    items: [
      {
        name: `kallem ${params.planTier}`,
        amount: amountCents,
        description: `${params.planTier} monthly plan for AI WhatsApp replies`,
        quantity: 1,
      },
    ],
    billing_data: {
      apartment: "NA",
      first_name: firstName,
      last_name: lastName,
      street: "NA",
      building: "NA",
      phone_number: "NA",
      city: "NA",
      country: "NA",
      email: params.email,
      floor: "NA",
      state: "NA",
    },
    customer: {
      first_name: firstName,
      last_name: lastName,
      email: params.email,
    },
    extras: {
      userId: params.userId,
      planTier: params.planTier,
    },
    special_reference: reference,
    notification_url: `${appEnv.NEXT_PUBLIC_APP_URL}/api/webhooks/paymob`,
    redirection_url: `${appEnv.NEXT_PUBLIC_APP_URL}/api/billing/paymob-return`,
  };

  const response = await fetch(`${PAYMOB_API_BASE_URL}/v1/intention/`, {
    method: "POST",
    headers: {
      Authorization: `Token ${appEnv.PAYMOB_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  let data: PaymobIntentionResponse;

  try {
    data = responseText ? (JSON.parse(responseText) as PaymobIntentionResponse) : {};
  } catch {
    data = {};
  }

  if (!response.ok) {
    logger.error("paymob.createCheckoutSession", "Paymob rejected checkout creation.", {
      status: response.status,
      response: responseText.slice(0, 800),
      reference,
    });
    throw new PaymobRequestError("Paymob could not create checkout. Please verify the Paymob configuration.", response.status);
  }

  const clientSecret = data.client_secret ?? data.clientSecret;

  if (!clientSecret) {
    logger.error("paymob.createCheckoutSession", "Paymob response did not include a client secret.", {
      status: response.status,
      response: responseText.slice(0, 800),
      reference,
    });
    throw new PaymobRequestError("Paymob did not return a checkout client secret.", 502);
  }

  const intentionId = String(data.id ?? data.intention_order_id ?? data.intentionOrderId ?? reference);
  const url = `${PAYMOB_API_BASE_URL}/unifiedcheckout/?publicKey=${encodeURIComponent(appEnv.PAYMOB_PUBLIC_KEY)}&clientSecret=${encodeURIComponent(clientSecret)}`;

  return {
    url,
    reference,
    intentionId,
    amountCents,
    currency: appEnv.PAYMOB_CURRENCY,
  };
}

const TRANSACTION_HMAC_FIELD_PATHS = [
  "amount_cents",
  "created_at",
  "currency",
  "error_occured",
  "has_parent_transaction",
  "id",
  "integration_id",
  "is_3d_secure",
  "is_auth",
  "is_capture",
  "is_refunded",
  "is_standalone_payment",
  "is_voided",
  "order.id",
  "owner",
  "pending",
  "source_data.pan",
  "source_data.sub_type",
  "source_data.type",
  "success",
] as const;

function getPathValue(record: Record<string, unknown>, path: string): string {
  const value = path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    return (current as Record<string, unknown>)[key];
  }, record);

  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function timingSafeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyPaymobTransactionHmac(record: Record<string, unknown>, hmac: string | null | undefined): boolean {
  if (!hmac) {
    return false;
  }

  const raw = TRANSACTION_HMAC_FIELD_PATHS.map((path) => getPathValue(record, path)).join("");
  const expected = crypto.createHmac("sha512", appEnv.PAYMOB_HMAC_SECRET).update(raw).digest("hex");

  return timingSafeEqual(expected, hmac.toLowerCase());
}
