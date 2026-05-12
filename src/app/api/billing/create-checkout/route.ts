// FILE: src/app/api/billing/create-checkout/route.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Checkout creation is tenant-scoped and delegates subscription
 * payment collection to Stripe Checkout.
 */
import { PlanTier } from "@prisma/client";

import { requireAppUser, UnauthorizedError } from "@/lib/api/auth";
import { InvalidJsonError, readJsonRequestBody } from "@/lib/api/request";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess } from "@/lib/api/response";
import { createCheckoutSession } from "@/lib/stripe/client";
import { logger } from "@/lib/utils/logger";
import { createCheckoutSchema } from "@/lib/validators/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const body = await readJsonRequestBody(request);
    const parsed = createCheckoutSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("A valid paid plan is required for checkout.", 422);
    }

    if (user.planTier === parsed.data.planTier) {
      return jsonError("You are already on this plan.", 409);
    }

    if (user.planTier !== PlanTier.FREE) {
      return jsonError("Use the Stripe Portal to change paid plans.", 409);
    }

    const session = await createCheckoutSession({
      userId: user.id,
      email: user.email,
      planTier: parsed.data.planTier,
    });

    if (!session.url) {
      return jsonError("Stripe did not return a Checkout URL.", 502);
    }

    return jsonSuccess({ url: session.url });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(error.message, 401);
    }

    if (error instanceof InvalidJsonError) {
      return jsonError(error.message, 400);
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.billing.createCheckout", error);

    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }

    logger.error("api.billing.createCheckout", "Failed to create checkout session.", { error });
    return jsonError("Failed to create checkout session.", 500);
  }
}
