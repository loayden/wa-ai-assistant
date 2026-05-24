// FILE: src/app/api/knowledge/route.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Knowledge CRUD is scoped to the authenticated app user and keeps
 * text/hours as one entry each, while FAQ can have many entries.
 */
import { requireAppUser, UnauthorizedError } from "@/lib/api/auth";
import { serializeKnowledgeEntry } from "@/lib/api/knowledge";
import { InvalidJsonError, readJsonRequestBody } from "@/lib/api/request";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess, jsonValidationError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/utils/logger";
import { createKnowledgeEntrySchema } from "@/lib/validators/knowledge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireAppUser();
    const entries = await prisma.knowledgeBaseEntry.findMany({
      where: { userId: user.id },
      orderBy: [{ type: "asc" }, { updatedAt: "desc" }],
    });

    return jsonSuccess({ entries: entries.map(serializeKnowledgeEntry) });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(error.message, 401);
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.knowledge.get", error);

    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }

    logger.error("api.knowledge.get", "Failed to load knowledge base.", { error });
    return jsonError("Failed to load knowledge base.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const body = await readJsonRequestBody(request);
    const parsed = createKnowledgeEntrySchema.safeParse(body);

    if (!parsed.success) {
      return jsonValidationError(parsed.error);
    }

    const existingSingleton =
      parsed.data.type === "faq"
        ? null
        : await prisma.knowledgeBaseEntry.findFirst({
            where: {
              userId: user.id,
              type: parsed.data.type,
            },
          });

    const entry = existingSingleton
      ? await prisma.knowledgeBaseEntry.update({
          where: { id: existingSingleton.id },
          data: {
            title: parsed.data.title,
            content: parsed.data.content,
          },
        })
      : await prisma.knowledgeBaseEntry.create({
          data: {
            userId: user.id,
            type: parsed.data.type,
            title: parsed.data.title,
            content: parsed.data.content,
          },
        });

    return jsonSuccess({ entry: serializeKnowledgeEntry(entry) }, { status: existingSingleton ? 200 : 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(error.message, 401);
    }

    if (error instanceof InvalidJsonError) {
      return jsonError(error.message, 400);
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.knowledge.post", error);

    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }

    logger.error("api.knowledge.post", "Failed to save knowledge entry.", { error });
    return jsonError("Failed to save knowledge entry.", 500);
  }
}
