/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Chat payment links reuse Paymob's hosted checkout, keeping card
 * collection outside kallem while linking successful payments back to orders.
 */
import "server-only";

import type { Order } from "@prisma/client";

import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";

const PAYMOB_API_BASE_URL = "https://accept.paymob.com";

type PaymobIntentionResponse = {
  id?: string | number;
  client_secret?: string;
  clientSecret?: string;
};

export function createOrderPaymentReference(orderId: string): string {
  return `kallem-order:${orderId}:${Date.now()}`;
}

export function parseOrderPaymentReference(reference: string | null | undefined): { orderId: string } | null {
  const match = reference?.match(/^kallem-order:([0-9a-f-]{36}):\d+$/i);
  return match ? { orderId: match[1] } : null;
}

function getPaymentMethods(): Array<number | string> {
  const raw = appEnv.PAYMOB_CARD_INTEGRATION_ID?.trim();

  if (!raw) {
    throw new Error("Paymob card integration ID is missing.");
  }

  return raw
    .split(",")
    .map((method) => method.trim())
    .filter(Boolean)
    .map((method) => (/^\d+$/.test(method) ? Number(method) : method));
}

export async function createOrderPaymentLink(params: {
  order: Pick<Order, "id" | "subtotal" | "customerPhone">;
  businessName: string;
  customerEmail?: string | null;
}): Promise<{ url: string; reference: string; intentionId: string }> {
  const reference = createOrderPaymentReference(params.order.id);
  const amountCents = params.order.subtotal;
  const customerEmail = params.customerEmail || "customer@kallem.app";

  const payload = {
    amount: amountCents,
    currency: appEnv.PAYMOB_CURRENCY,
    payment_methods: getPaymentMethods(),
    items: [
      {
        name: `Order from ${params.businessName}`,
        amount: amountCents,
        description: `WhatsApp order ${params.order.id}`,
        quantity: 1,
      },
    ],
    billing_data: {
      apartment: "NA",
      first_name: "WhatsApp",
      last_name: "Customer",
      street: "NA",
      building: "NA",
      phone_number: params.order.customerPhone,
      city: "Cairo",
      country: "EG",
      email: customerEmail,
      floor: "NA",
      state: "Cairo",
    },
    customer: {
      first_name: "WhatsApp",
      last_name: "Customer",
      email: customerEmail,
    },
    extras: {
      orderId: params.order.id,
      type: "order_payment",
    },
    special_reference: reference,
    notification_url: `${appEnv.NEXT_PUBLIC_APP_URL}/api/webhooks/paymob`,
    redirection_url: `${appEnv.NEXT_PUBLIC_APP_URL}/orders?payment=paymob-return`,
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
  let data: PaymobIntentionResponse = {};

  try {
    data = responseText ? (JSON.parse(responseText) as PaymobIntentionResponse) : {};
  } catch {
    data = {};
  }

  if (!response.ok || !(data.client_secret ?? data.clientSecret)) {
    logger.error("paymob.orderPayment", "Paymob rejected order payment link creation.", {
      status: response.status,
      response: responseText.slice(0, 800),
      reference,
    });
    throw new Error("Paymob could not create an order payment link.");
  }

  const clientSecret = data.client_secret ?? data.clientSecret ?? "";

  return {
    url: `${PAYMOB_API_BASE_URL}/unifiedcheckout/?publicKey=${encodeURIComponent(appEnv.PAYMOB_PUBLIC_KEY)}&clientSecret=${encodeURIComponent(clientSecret)}`,
    reference,
    intentionId: String(data.id ?? reference),
  };
}
