import { ForbiddenError, UnauthorizedError, requireAdminUser } from "@/lib/api/auth";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess } from "@/lib/api/response";
import { getAdminBusinesses } from "@/lib/admin/queries";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const filters = new Set(["all", "paid", "free", "churn_risk"]);

export async function GET(request: Request) {
  try {
    await requireAdminUser();
    const url = new URL(request.url);
    const filter = url.searchParams.get("filter") ?? "all";
    const page = Number(url.searchParams.get("page") ?? 1);
    const limit = Number(url.searchParams.get("limit") ?? 20);

    if (!filters.has(filter)) {
      return jsonError("Invalid business filter.", 422);
    }

    return jsonSuccess(await getAdminBusinesses({ filter: filter as "all" | "paid" | "free" | "churn_risk", page, limit }));
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(error.message, 401);
    if (error instanceof ForbiddenError) return jsonError(error.message, 403);

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.admin.businesses", error);
    if (databaseErrorResponse) return databaseErrorResponse;

    logger.error("api.admin.businesses", "Failed to load admin businesses.", { error });
    return jsonError("Failed to load admin businesses.", 500);
  }
}
