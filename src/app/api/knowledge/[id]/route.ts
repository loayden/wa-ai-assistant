// FILE: src/app/api/knowledge/[id]/route.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: ID routes always read the record through the current tenant before
 * mutating, avoiding cross-user updates even if a UUID is guessed.
 */
import { z } from "zod";

import { requireAppUser, UnauthorizedError } from "@/lib/api/auth";
import { serializeKnowledgeEntry } from "@/lib/api/knowledge";
import { InvalidJsonError, readJsonRequestBody } from "@/lib/api/request";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess, jsonValidationError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/utils/logger";
import { updateKnowledgeEntrySchema } from "@/lib/validators/knowledge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireAppUser();
    const params = paramsSchema.safeParse(await context.params);

    if (!params.success) {
      return jsonValidationError(params.error);
    }

    const body = await readJsonRequestBody(request);
    const parsed = updateKnowledgeEntrySchema.safeParse(body);

    if (!parsed.success) {
      return jsonValidationError(parsed.error);
    }

    const existing = await prisma.knowledgeBaseEntry.findFirst({
      where: {
        id: params.data.id,
        userId: user.id,
      },
    });

    if (!existing) {
      return jsonError("Knowledge entry not found.", 404);
    }

    const entry = await prisma.knowledgeBaseEntry.update({
      where: { id: existing.id },
      data: parsed.data,
    });

    return jsonSuccess({ entry: serializeKnowledgeEntry(entry) });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(error.message, 401);
    }

    if (error instanceof InvalidJsonError) {
      return jsonError(error.message, 400);
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.knowledge.patch", error);

    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }

    logger.error("api.knowledge.patch", "Failed to update knowledge entry.", { error });
    return jsonError("Failed to update knowledge entry.", 500);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await requireAppUser();
    const params = paramsSchema.safeParse(await context.params);

    if (!params.success) {
      return jsonValidationError(params.error);
    }

    const existing = await prisma.knowledgeBaseEntry.findFirst({
      where: {
        id: params.data.id,
        userId: user.id,
      },
    });

    if (!existing) {
      return jsonError("Knowledge entry not found.", 404);
    }

    await prisma.knowledgeBaseEntry.delete({
      where: { id: existing.id },
    });

    return jsonSuccess({ deleted: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(error.message, 401);
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.knowledge.delete", error);

    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }

    logger.error("api.knowledge.delete", "Failed to delete knowledge entry.", { error });
    return jsonError("Failed to delete knowledge entry.", 500);
  }
}
