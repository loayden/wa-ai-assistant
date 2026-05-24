// FILE: src/app/api/broadcasts/route.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Broadcast creation stores recipients first; sending is a separate
 * guarded action so owners can review before consuming WhatsApp quota.
 */
import { requireAppUser, UnauthorizedError } from "@/lib/api/auth";
import {
  jsonDatabaseUnavailableIfNeeded,
  jsonError,
  jsonMethodNotAllowed,
  jsonSuccess,
  jsonValidationError,
} from "@/lib/api/response";
import { broadcastCreateSchema, normalizePhoneForSend } from "@/lib/broadcasts/utils";
import { prisma } from "@/lib/prisma/client";
import { serializeBroadcast } from "@/lib/templates/service";
import { logger } from "@/lib/utils/logger";
import type { BroadcastMutationResponse, BroadcastsResponse } from "@/types/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireAppUser();
    const broadcasts = await prisma.broadcast.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        template: true,
        recipients: {
          orderBy: { createdAt: "asc" },
          take: 20,
        },
      },
    });

    return jsonSuccess<BroadcastsResponse>({ broadcasts: broadcasts.map(serializeBroadcast) });
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(error.message, 401);

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.broadcasts.get", error);
    if (databaseErrorResponse) return databaseErrorResponse;

    logger.error("api.broadcasts.get", "Failed to load broadcasts.", { error });
    return jsonError("Failed to load broadcasts.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const parsed = broadcastCreateSchema.safeParse(await request.json());

    if (!parsed.success) {
      return jsonValidationError(parsed.error);
    }

    const template = await prisma.messageTemplate.findFirst({
      where: {
        id: parsed.data.templateId,
        userId: user.id,
        status: "approved",
      },
    });

    if (!template) {
      return jsonError("Choose an approved message template before creating a broadcast.", 404);
    }

    const connectionId = parsed.data.connectionId ?? template.connectionId;
    const connection = await prisma.whatsAppConnection.findFirst({
      where: {
        id: connectionId ?? undefined,
        userId: user.id,
        isActive: true,
        isVerified: true,
      },
    });

    if (!connection) {
      return jsonError("Connect and verify a WhatsApp number before creating broadcasts.", 404);
    }

    const recipients = parsed.data.recipients.map((recipient) => ({
      phone: normalizePhoneForSend(recipient.phone),
      name: recipient.name || null,
    }));

    const broadcast = await prisma.broadcast.create({
      data: {
        userId: user.id,
        connectionId: connection.id,
        templateId: template.id,
        name: parsed.data.name,
        parameters: parsed.data.parameters,
        recipientCount: recipients.length,
        recipients: {
          createMany: {
            data: recipients,
          },
        },
      },
      include: {
        template: true,
        recipients: true,
      },
    });

    return jsonSuccess<BroadcastMutationResponse>({ broadcast: serializeBroadcast(broadcast) }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(error.message, 401);

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.broadcasts.post", error);
    if (databaseErrorResponse) return databaseErrorResponse;

    logger.error("api.broadcasts.post", "Failed to create broadcast.", { error });
    return jsonError("Failed to create broadcast.", 500);
  }
}

export async function PATCH() {
  return jsonMethodNotAllowed("PATCH");
}
