import { UnauthorizedError, requireAppUser } from "@/lib/api/auth";
import { InvalidJsonError, readJsonRequestBody } from "@/lib/api/request";
import { serializeLead } from "@/lib/api/leads";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess, jsonValidationError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/utils/logger";
import { leadParamsSchema, updateLeadSchema } from "@/lib/validators/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireAppUser();
    const params = leadParamsSchema.safeParse(await context.params);

    if (!params.success) {
      return jsonValidationError(params.error);
    }

    const body = await readJsonRequestBody(request);
    const parsed = updateLeadSchema.safeParse(body);

    if (!parsed.success) {
      return jsonValidationError(parsed.error);
    }

    const existing = await prisma.lead.findFirst({
      where: {
        id: params.data.id,
        userId: user.id,
      },
    });

    if (!existing) {
      return jsonError("Lead not found.", 404);
    }

    const lead = await prisma.lead.update({
      where: { id: params.data.id },
      data: { status: parsed.data.status },
    });

    return jsonSuccess({ lead: serializeLead(lead) });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(error.message, 401);
    }

    if (error instanceof InvalidJsonError) {
      return jsonError(error.message, 400);
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.leads.patch", error);

    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }

    logger.error("api.leads.patch", "Failed to update lead.", { error });
    return jsonError("Failed to update lead.", 500);
  }
}
