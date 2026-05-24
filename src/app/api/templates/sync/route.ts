// FILE: src/app/api/templates/sync/route.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Sync keeps local template state honest by treating Meta as the
 * source of truth for approval/rejection.
 */
import { requireAppUser, UnauthorizedError } from "@/lib/api/auth";
import {
  jsonDatabaseUnavailableIfNeeded,
  jsonError,
  jsonMethodNotAllowed,
  jsonSuccess,
} from "@/lib/api/response";
import { whatsappClient } from "@/lib/api/whatsapp";
import { prisma } from "@/lib/prisma/client";
import { normalizeMetaTemplateStatus } from "@/lib/templates/meta";
import { getOwnedConnectionForTemplates, serializeTemplate } from "@/lib/templates/service";
import { logger } from "@/lib/utils/logger";
import type { MessageTemplatesResponse } from "@/types/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const user = await requireAppUser();
    const connections = await prisma.whatsAppConnection.findMany({
      where: { userId: user.id, isActive: true, isVerified: true },
      orderBy: { createdAt: "desc" },
    });

    for (const rawConnection of connections) {
      const connection = await getOwnedConnectionForTemplates(user.id, rawConnection.id);
      if (!connection) continue;

      const metaTemplates = await whatsappClient.listTemplates(connection.businessAccountId, {
        accessToken: connection.decryptedAccessToken,
      });
      const byName = new Map((metaTemplates.data ?? []).map((template) => [template.name, template]));
      const localTemplates = await prisma.messageTemplate.findMany({
        where: { userId: user.id, connectionId: connection.id },
      });

      await Promise.all(
        localTemplates.map((template) => {
          const metaTemplate = byName.get(template.name);
          if (!metaTemplate) return Promise.resolve(template);

          return prisma.messageTemplate.update({
            where: { id: template.id },
            data: {
              metaTemplateId: metaTemplate.id ?? template.metaTemplateId,
              status: normalizeMetaTemplateStatus(metaTemplate.status),
              rejectionReason: metaTemplate.rejected_reason ?? null,
            },
          });
        }),
      );
    }

    const templates = await prisma.messageTemplate.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return jsonSuccess<MessageTemplatesResponse>({ templates: templates.map(serializeTemplate) });
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(error.message, 401);

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.templates.sync", error);
    if (databaseErrorResponse) return databaseErrorResponse;

    logger.error("api.templates.sync", "Failed to sync template statuses.", { error });
    return jsonError("Failed to sync template statuses.", 500);
  }
}

export async function GET() {
  return jsonMethodNotAllowed("GET");
}
