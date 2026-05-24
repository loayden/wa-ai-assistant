import { z } from "zod";

import { UnauthorizedError, requireAppUser } from "@/lib/api/auth";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess, jsonValidationError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await requireAppUser();
    const params = paramsSchema.safeParse(await context.params);

    if (!params.success) {
      return jsonValidationError(params.error);
    }

    const correction = await prisma.aiCorrection.findFirst({
      where: {
        id: params.data.id,
        userId: user.id,
      },
      select: { id: true },
    });

    if (!correction) {
      return jsonError("Correction not found.", 404);
    }

    await prisma.aiCorrection.delete({
      where: { id: correction.id },
    });

    return jsonSuccess({ deleted: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(error.message, 401);

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.corrections.delete", error);
    if (databaseErrorResponse) return databaseErrorResponse;

    logger.error("api.corrections.delete", "Failed to delete AI correction.", { error });
    return jsonError("Failed to delete AI correction.", 500);
  }
}
