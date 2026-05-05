// FILE: src/app/api/billing/portal/route.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Existing customers manage subscription state in Stripe's hosted
 * Customer Portal so card updates and cancellations remain billing-system owned.
 */
import { requireAppUser, UnauthorizedError } from "@/lib/api/auth";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess } from "@/lib/api/response";
import { createPortalSession } from "@/lib/stripe/client";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireAppUser();

    if (!user.stripeCustomerId) {
      return jsonError("No Stripe customer exists for this user.", 400);
    }

    const session = await createPortalSession(user.stripeCustomerId);

    return jsonSuccess({ url: session.url });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(error.message, 401);
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.billing.portal", error);

    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }

    logger.error("api.billing.portal", "Failed to create portal session.", { error });
    return jsonError("Failed to create billing portal session.", 500);
  }
}
