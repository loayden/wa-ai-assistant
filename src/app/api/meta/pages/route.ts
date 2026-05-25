import { requireAppUser, UnauthorizedError } from "@/lib/api/auth";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess } from "@/lib/api/response";
import { sanitizeConnection } from "@/lib/api/whatsapp";
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireAppUser();
    const connections = await prisma.whatsAppConnection.findMany({
      where: {
        userId: user.id,
        channel: { in: ["messenger", "instagram"] },
      },
      orderBy: [{ channel: "asc" }, { createdAt: "desc" }],
    });

    return jsonSuccess({
      connections: connections.map(sanitizeConnection),
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(error.message, 401);
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.meta.pages", error);

    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }

    logger.error("api.meta.pages", "Failed to load social channel connections.", { error });
    return jsonError("فشل تحميل قنوات Meta.", 500);
  }
}
