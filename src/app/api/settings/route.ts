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
import { getOrCreateUserSettings, updateUserSettings } from "@/lib/api/settings";
import { normalizeNotificationPrefs } from "@/lib/notifications/preferences";
import { logger } from "@/lib/utils/logger";
import { updateSettingsSchema } from "@/lib/validators/settings";
import type { SettingsResponse } from "@/types/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serializeSettingsUser(user: Awaited<ReturnType<typeof requireAppUser>>): SettingsResponse["user"] {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    isAdmin: user.isAdmin,
    planTier: user.planTier,
    subscriptionStatus: user.subscriptionStatus,
    monthlyReplyCount: user.monthlyReplyCount,
    onboardingCompleted: user.onboardingCompleted,
    trialEndsAt: user.trialEndsAt?.toISOString() ?? null,
    trialUsed: user.trialUsed,
    paidAt: user.paidAt?.toISOString() ?? null,
    usageAlert80SentAt: user.usageAlert80SentAt?.toISOString() ?? null,
    usageAlert100SentAt: user.usageAlert100SentAt?.toISOString() ?? null,
    replyCountResetAt: user.replyCountResetAt.toISOString(),
    paymentCustomerId: user.paymentCustomerId,
    paymentSubscriptionId: user.paymentSubscriptionId,
  };
}

export async function GET() {
  try {
    const user = await requireAppUser();
    const settings = await getOrCreateUserSettings(user.id);

    return jsonSuccess({
      settings: {
        ...settings,
        notificationPrefs: normalizeNotificationPrefs(settings.notificationPrefs),
      },
      user: serializeSettingsUser(user),
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

    const persistedData = {
      ...(parsed.data.systemPrompt !== undefined ? { systemPrompt: parsed.data.systemPrompt } : {}),
      ...(parsed.data.autoReplyEnabled !== undefined ? { autoReplyEnabled: parsed.data.autoReplyEnabled } : {}),
      ...(parsed.data.language !== undefined ? { language: parsed.data.language } : {}),
      ...(parsed.data.businessName !== undefined ? { businessName: parsed.data.businessName } : {}),
      ...(parsed.data.businessContext !== undefined ? { businessContext: parsed.data.businessContext } : {}),
      ...(parsed.data.fallbackMessage !== undefined ? { fallbackMessage: parsed.data.fallbackMessage } : {}),
      ...(parsed.data.maxReplyLength !== undefined ? { maxReplyLength: parsed.data.maxReplyLength } : {}),
      ...(parsed.data.workingHoursEnabled !== undefined ? { workingHoursEnabled: parsed.data.workingHoursEnabled } : {}),
      ...(parsed.data.workingHoursStart !== undefined ? { workingHoursStart: parsed.data.workingHoursStart } : {}),
      ...(parsed.data.workingHoursEnd !== undefined ? { workingHoursEnd: parsed.data.workingHoursEnd } : {}),
      ...(parsed.data.workingDays !== undefined ? { workingDays: parsed.data.workingDays } : {}),
      ...(parsed.data.offHoursMessage !== undefined ? { offHoursMessage: parsed.data.offHoursMessage } : {}),
      ...(parsed.data.timezone !== undefined ? { timezone: parsed.data.timezone } : {}),
      ...(parsed.data.csatEnabled !== undefined ? { csatEnabled: parsed.data.csatEnabled } : {}),
      ...(parsed.data.notificationPrefs !== undefined
        ? { notificationPrefs: normalizeNotificationPrefs(parsed.data.notificationPrefs) }
        : {}),
    };

    const settings = await updateUserSettings(user.id, persistedData);

    return jsonSuccess({
      settings: {
        ...settings,
        notificationPrefs: normalizeNotificationPrefs(settings.notificationPrefs),
      },
      user: serializeSettingsUser(user),
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
