import { UnauthorizedError, requireAppUser } from "@/lib/api/auth";
import { leadsToCsv } from "@/lib/api/leads";
import { jsonDatabaseUnavailableIfNeeded, jsonError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireAppUser();
    const leads = await prisma.lead.findMany({
      where: { userId: user.id },
      orderBy: { detectedAt: "desc" },
    });

    return new Response(leadsToCsv(leads), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="leads.csv"',
      },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(error.message, 401);
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.leads.export", error);

    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }

    logger.error("api.leads.export", "Failed to export leads.", { error });
    return jsonError("Failed to export leads.", 500);
  }
}
