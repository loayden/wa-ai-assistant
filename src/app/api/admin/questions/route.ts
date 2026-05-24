import { ForbiddenError, UnauthorizedError, requireAdminUser } from "@/lib/api/auth";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess } from "@/lib/api/response";
import { getAdminQuestions } from "@/lib/admin/queries";
import { logger } from "@/lib/utils/logger";
import { checkRateLimit } from "@/lib/utils/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ranges = new Set(["7d", "30d"]);

export async function GET(request: Request) {
  try {
    const admin = await requireAdminUser();
    const rateLimit = checkRateLimit({
      key: `admin-questions:${admin.id}`,
      limit: 3,
      windowMs: 60_000,
      context: "api.admin.questions",
    });

    if (!rateLimit.allowed) {
      return jsonError("طلبات كثيرة جداً، انتظر قليلاً.", 429, {
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      });
    }

    const range = new URL(request.url).searchParams.get("range") ?? "7d";

    if (!ranges.has(range)) {
      return jsonError("Invalid questions range.", 422);
    }

    return jsonSuccess(await getAdminQuestions(range as "7d" | "30d"));
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(error.message, 401);
    if (error instanceof ForbiddenError) return jsonError(error.message, 403);

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.admin.questions", error);
    if (databaseErrorResponse) return databaseErrorResponse;

    logger.error("api.admin.questions", "Failed to load admin questions.", { error });
    return jsonError("Failed to load admin questions.", 500);
  }
}
