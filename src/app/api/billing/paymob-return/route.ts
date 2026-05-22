// FILE: src/app/api/billing/paymob-return/route.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Paymob redirects customers back through this server endpoint so a
 * signed successful return can update the plan even if the async webhook is
 * delayed. The normal webhook remains the source of truth and is idempotent.
 */
import { NextResponse } from "next/server";

import { jsonDatabaseUnavailableIfNeeded } from "@/lib/api/response";
import {
  getPaymobCallbackHmac,
  parsePaymobCallbackBody,
  parsePaymobCallbackSearchParams,
  PaymobWebhookSignatureError,
  processPaymobCallback,
  type UnknownRecord,
} from "@/lib/paymob/webhook";
import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function billingRedirect(checkoutStatus: "success" | "paymob-return" | "failed") {
  const redirectUrl = new URL("/billing", appEnv.NEXT_PUBLIC_APP_URL);
  redirectUrl.searchParams.set("checkout", checkoutStatus);
  return NextResponse.redirect(redirectUrl);
}

async function handlePaymobReturn(payload: UnknownRecord, hmac: string | null) {
  if (!hmac) {
    return billingRedirect("paymob-return");
  }

  try {
    const result = await processPaymobCallback({
      payload,
      hmac,
      context: "api.billing.paymobReturn",
    });

    if (result.success) {
      return billingRedirect("success");
    }

    if (result.pending || result.ignored) {
      return billingRedirect("paymob-return");
    }

    return billingRedirect("failed");
  } catch (error) {
    if (error instanceof PaymobWebhookSignatureError) {
      logger.warn("api.billing.paymobReturn", "Paymob return signature was invalid.", { error });
      return billingRedirect("failed");
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.billing.paymobReturn", error);

    if (databaseErrorResponse) {
      return billingRedirect("paymob-return");
    }

    logger.error("api.billing.paymobReturn", "Paymob return processing failed.", { error });
    return billingRedirect("failed");
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const payload = parsePaymobCallbackSearchParams(url.searchParams);
  return handlePaymobReturn(payload, getPaymobCallbackHmac(payload, url.searchParams));
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const payload = parsePaymobCallbackBody(await request.text());
  return handlePaymobReturn(payload, getPaymobCallbackHmac(payload, url.searchParams));
}
