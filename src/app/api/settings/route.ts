// FILE: src/app/api/settings/route.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Settings reads lazily create defaults, while writes enforce
 * paid-plan prompt customization at the server boundary.
 */
import { PlanTier } from "@prisma/client";

import { requireAppUser, UnauthorizedError } from "@/lib/api/auth";
import { InvalidJsonError, readJsonRequestBody } from "@/lib/api/request";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess, jsonValidationError } from "@/lib/api/response";
import { getOrCreateUserSettings } from "@/lib/api/settings";
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/utils/logger";
import { updateSettingsSchema } from "@/lib/validators/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireAppUser();
    const settings = await getOrCreateUserSettings(user.id);

    return jsonSuccess({
      settings,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        planTier: user.planTier,
        subscriptionStatus: user.subscriptionStatus,
        monthlyReplyCount: user.monthlyReplyCount,
        replyCountResetAt: user.replyCountResetAt,
        stripeCustomerId: user.stripeCustomerId,
        stripeSubscriptionId: user.stripeSubscriptionId,
      },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(error.message, 401);
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.settings.get", error);

    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }

    logger.error("api.settings.get", "Failed to load settings.", { error });
    return jsonError("Failed to load settings.", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireAppUser();
    const body = await readJsonRequestBody(request);
    const parsed = updateSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return jsonValidationError(parsed.error);
    }

    if (user.planTier === PlanTier.FREE && parsed.data.systemPrompt !== undefined) {
      return jsonError("Custom prompts are available on the PRO and BUSINESS plans.", 403);
    }

    const settings = await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: parsed.data,
      create: {
        userId: user.id,
        ...parsed.data,
      },
    });

    return jsonSuccess({
      settings,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        planTier: user.planTier,
        subscriptionStatus: user.subscriptionStatus,
        monthlyReplyCount: user.monthlyReplyCount,
        replyCountResetAt: user.replyCountResetAt,
        stripeCustomerId: user.stripeCustomerId,
        stripeSubscriptionId: user.stripeSubscriptionId,
      },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(error.message, 401);
    }

    if (error instanceof InvalidJsonError) {
      return jsonError(error.message, 400);
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.settings.put", error);

    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }

    logger.error("api.settings.put", "Failed to update settings.", { error });
    return jsonError("Failed to update settings.", 500);
  }
}
