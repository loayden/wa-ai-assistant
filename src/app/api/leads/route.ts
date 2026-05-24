import { UnauthorizedError, requireAppUser } from "@/lib/api/auth";
import { serializeLead } from "@/lib/api/leads";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess, jsonValidationError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/utils/logger";
import { leadsQuerySchema } from "@/lib/validators/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireAppUser();
    const { searchParams } = new URL(request.url);
    const parsed = leadsQuerySchema.safeParse(Object.fromEntries(searchParams));

    if (!parsed.success) {
      return jsonValidationError(parsed.error);
    }

    const where = {
      userId: user.id,
      status: parsed.data.status,
      channel: parsed.data.channel,
    };

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { detectedAt: "desc" },
        take: 100,
      }),
      prisma.lead.count({ where }),
    ]);

    return jsonSuccess(
      {
        leads: leads.map(serializeLead),
      },
      {
        meta: { total },
      },
    );
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(error.message, 401);
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.leads.get", error);

    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }

    logger.error("api.leads.get", "Failed to load leads.", { error });
    return jsonError("Failed to load leads.", 500);
  }
}
