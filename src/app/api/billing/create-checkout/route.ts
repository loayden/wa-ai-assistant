// FILE: src/app/api/billing/create-checkout/route.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Checkout creation is tenant-scoped and delegates subscription
 * payment collection to Stripe Checkout.
 */
import { requireAppUser, UnauthorizedError } from "@/lib/api/auth";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess } from "@/lib/api/response";
import { createCheckoutSession } from "@/lib/stripe/client";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const user = await requireAppUser();
    const session = await createCheckoutSession(user.id, user.email);

    if (!session.url) {
      return jsonError("Stripe did not return a Checkout URL.", 502);
    }

    return jsonSuccess({ url: session.url });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(error.message, 401);
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.billing.createCheckout", error);

    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }

    logger.error("api.billing.createCheckout", "Failed to create checkout session.", { error });
    return jsonError("Failed to create checkout session.", 500);
  }
}
