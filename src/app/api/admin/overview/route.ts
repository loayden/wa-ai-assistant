import { ForbiddenError, UnauthorizedError, requireAdminUser } from "@/lib/api/auth";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess } from "@/lib/api/response";
import { getAdminOverview } from "@/lib/admin/queries";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminUser();
    return jsonSuccess(await getAdminOverview());
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(error.message, 401);
    if (error instanceof ForbiddenError) return jsonError(error.message, 403);

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.admin.overview", error);
    if (databaseErrorResponse) return databaseErrorResponse;

    logger.error("api.admin.overview", "Failed to load admin overview.", { error });
    return jsonError("Failed to load admin overview.", 500);
  }
}
