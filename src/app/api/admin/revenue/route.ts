import { ForbiddenError, UnauthorizedError, requireAdminUser } from "@/lib/api/auth";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess } from "@/lib/api/response";
import { getAdminRevenue, type AdminRange } from "@/lib/admin/queries";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ranges = new Set(["7d", "30d", "90d"]);

export async function GET(request: Request) {
  try {
    await requireAdminUser();
    const range = new URL(request.url).searchParams.get("range") ?? "30d";

    if (!ranges.has(range)) {
      return jsonError("Invalid revenue range.", 422);
    }

    return jsonSuccess(await getAdminRevenue(range as AdminRange));
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(error.message, 401);
    if (error instanceof ForbiddenError) return jsonError(error.message, 403);

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.admin.revenue", error);
    if (databaseErrorResponse) return databaseErrorResponse;

    logger.error("api.admin.revenue", "Failed to load admin revenue.", { error });
    return jsonError("Failed to load admin revenue.", 500);
  }
}
