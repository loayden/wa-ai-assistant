// FILE: src/app/api/templates/[id]/route.ts
import { requireAppUser, UnauthorizedError } from "@/lib/api/auth";
import {
  jsonDatabaseUnavailableIfNeeded,
  jsonError,
  jsonMethodNotAllowed,
  jsonSuccess,
} from "@/lib/api/response";
import { whatsappClient } from "@/lib/api/whatsapp";
import { prisma } from "@/lib/prisma/client";
import { getOwnedConnectionForTemplates } from "@/lib/templates/service";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const user = await requireAppUser();
    const template = await prisma.messageTemplate.findFirst({
      where: { id, userId: user.id },
    });

    if (!template) {
      return jsonError("Template not found.", 404);
    }

    const connection = await getOwnedConnectionForTemplates(user.id, template.connectionId ?? undefined);

    if (connection) {
      try {
        await whatsappClient.deleteTemplate(connection.businessAccountId, template.name, {
          accessToken: connection.decryptedAccessToken,
        });
      } catch (error) {
        logger.warn("api.templates.delete", "Meta template delete failed; removing local record only.", { error });
      }
    }

    await prisma.messageTemplate.delete({ where: { id: template.id } });

    return jsonSuccess({ deleted: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(error.message, 401);

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.templates.delete", error);
    if (databaseErrorResponse) return databaseErrorResponse;

    logger.error("api.templates.delete", "Failed to delete template.", { error });
    return jsonError("Failed to delete template.", 500);
  }
}

export async function GET() {
  return jsonMethodNotAllowed("GET");
}
