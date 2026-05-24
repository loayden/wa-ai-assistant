import { ForbiddenError, UnauthorizedError, requireAdminUser } from "@/lib/api/auth";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess } from "@/lib/api/response";
import { getAdminBusinessDetail } from "@/lib/admin/queries";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await requireAdminUser();
    const detail = await getAdminBusinessDetail(id);

    if (!detail) {
      return jsonError("Business not found.", 404);
    }

    return jsonSuccess(detail);
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(error.message, 401);
    if (error instanceof ForbiddenError) return jsonError(error.message, 403);

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.admin.business.detail", error);
    if (databaseErrorResponse) return databaseErrorResponse;

    logger.error("api.admin.business.detail", "Failed to load admin business detail.", { error, userId: id });
    return jsonError("Failed to load business detail.", 500);
  }
}
