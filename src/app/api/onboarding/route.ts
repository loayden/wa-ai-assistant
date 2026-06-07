// FILE: src/app/api/onboarding/route.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Onboarding can be skipped by the owner without altering WhatsApp,
 * billing, or auth state.
 */
import { requireAppUser, UnauthorizedError } from "@/lib/api/auth";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess } from "@/lib/api/response";
import { prisma } from "@/lib/prisma/client";
import { writeAuditLog } from "@/lib/security/audit-log";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { onboardingCompleted: true },
      });
    } catch (error) {
      if (!/onboarding_completed/i.test(error instanceof Error ? error.message : String(error))) {
        throw error;
      }
    }

    await writeAuditLog({
      userId: user.id,
      action: "onboarding.completed",
      entityType: "user",
      entityId: user.id,
      after: {
        onboardingCompleted: true,
      },
      request,
    });

    return jsonSuccess({ onboardingCompleted: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(error.message, 401);
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.onboarding.post", error);

    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }

    logger.error("api.onboarding.post", "Failed to update onboarding state.", { error });
    return jsonError("Failed to update onboarding state.", 500);
  }
}
