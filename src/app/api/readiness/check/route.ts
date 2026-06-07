/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Launch readiness is computed server-side from tenant-scoped data
 * and returns product-safe explanations without exposing provider secrets.
 */
import { requireAppUser, UnauthorizedError } from "@/lib/api/auth";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess } from "@/lib/api/response";
import { getLaunchReadiness, READINESS_CACHE_SECONDS } from "@/lib/readiness/checks";
import { writeReadinessSnapshot } from "@/lib/readiness/snapshots";
import { logger } from "@/lib/utils/logger";
import type { LaunchReadinessResponse, ReadinessMode } from "@/types/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseMode(request: Request): ReadinessMode {
  const mode = new URL(request.url).searchParams.get("mode");

  return mode === "light" ? "light" : "full";
}

export async function GET(request: Request) {
  try {
    const user = await requireAppUser();
    const mode = parseMode(request);
    const readiness = await getLaunchReadiness(user.id, { mode });

    if (mode === "full") {
      await writeReadinessSnapshot(user.id, readiness);
    }

    return jsonSuccess<LaunchReadinessResponse>(readiness, {
      headers: {
        "Cache-Control": `private, max-age=${READINESS_CACHE_SECONDS}`,
      },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(error.message, 401);
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.readiness.check", error);
    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }

    logger.error("api.readiness.check", "Failed to compute launch readiness.", { error });
    return jsonError("تعذر فحص جاهزية الإطلاق. حاول مرة أخرى.", 500);
  }
}
