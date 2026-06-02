// FILE: src/app/api/billing/create-checkout/route.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Checkout creation is tenant-scoped and delegates subscription
 * payment collection to Paymob hosted checkout.
 */
import { requireAppUser, UnauthorizedError } from "@/lib/api/auth";
import { InvalidJsonError, readJsonRequestBody } from "@/lib/api/request";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess } from "@/lib/api/response";
import { createPaymobCheckoutSession, PaymobConfigurationError, PaymobRequestError } from "@/lib/paymob/client";
import { detectPaymobMode } from "@/lib/paymob/mode";
import { prisma } from "@/lib/prisma/client";
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
      return jsonError("اختر خطة مدفوعة صحيحة قبل فتح الدفع.", 422);
    }

    if (user.planTier === parsed.data.planTier) {
      return jsonError("هذه الخطة مفعلة بالفعل.", 409);
    }

    const paymobMode = detectPaymobMode();

    if (paymobMode !== "live") {
      return jsonError("الدفع غير متاح الآن. سيتم تفعيله بعد ربط Paymob بوضع الإنتاج.", 503, { paymobMode });
    }

    const session = await createPaymobCheckoutSession({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      planTier: parsed.data.planTier,
    });

    await prisma.subscriptionEvent.upsert({
      where: { paymentEventId: session.reference },
      update: {
        status: "PENDING",
      },
      create: {
        userId: user.id,
        paymentEventId: session.reference,
        eventType: "paymob.checkout.created",
        planTier: parsed.data.planTier,
        status: "PENDING",
        amount: session.amountCents,
        currency: session.currency,
      },
    });

    return jsonSuccess({ url: session.url });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(error.message, 401);
    }

    if (error instanceof InvalidJsonError) {
      return jsonError(error.message, 400);
    }

    if (error instanceof PaymobConfigurationError) {
      return jsonError(error.message, 503);
    }

    if (error instanceof PaymobRequestError) {
      return jsonError(error.message, error.status >= 400 && error.status < 600 ? error.status : 502);
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.billing.createCheckout", error);

    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }

    logger.error("api.billing.createCheckout", "Failed to create Paymob checkout session.", { error });
    return jsonError("فشل إنشاء جلسة الدفع عبر Paymob.", 500);
  }
}
