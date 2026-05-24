import { PlanTier, SubscriptionStatus } from "@prisma/client";
import { z } from "zod";

import { ForbiddenError, UnauthorizedError, requireAdminUser } from "@/lib/api/auth";
import { InvalidJsonError, readJsonRequestBody } from "@/lib/api/request";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess, jsonValidationError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const overridePlanSchema = z.object({
  plan: z.enum(["FREE", "PRO", "BUSINESS"]),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await requireAdminUser();
    const parsed = overridePlanSchema.safeParse(await readJsonRequestBody(request));

    if (!parsed.success) {
      return jsonValidationError(parsed.error);
    }

    const planTier = parsed.data.plan as PlanTier;
    const updated = await prisma.user.update({
      where: { id },
      data: {
        planTier,
        subscriptionStatus: planTier === PlanTier.FREE ? SubscriptionStatus.INACTIVE : SubscriptionStatus.ACTIVE,
        trialEndsAt: null,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        planTier: true,
        subscriptionStatus: true,
        monthlyReplyCount: true,
      },
    });

    return jsonSuccess({ business: updated });
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(error.message, 401);
    if (error instanceof ForbiddenError) return jsonError(error.message, 403);
    if (error instanceof InvalidJsonError) return jsonError(error.message, 400);

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.admin.business.plan", error);
    if (databaseErrorResponse) return databaseErrorResponse;

    logger.error("api.admin.business.plan", "Failed to override plan.", { error, userId: id });
    return jsonError("Failed to update business plan.", 500);
  }
}
