import { MessageDirection, MessageStatus } from "@prisma/client";
import { z } from "zod";

import { whatsappClient } from "@/lib/api/whatsapp";
import { ForbiddenError, UnauthorizedError, requireAdminUser } from "@/lib/api/auth";
import { InvalidJsonError, readJsonRequestBody } from "@/lib/api/request";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess, jsonValidationError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma/client";
import { decrypt } from "@/lib/utils/encryption";
import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const adminMessageSchema = z.object({
  message: z.string().trim().min(1).max(1200),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await requireAdminUser();
    const parsed = adminMessageSchema.safeParse(await readJsonRequestBody(request));

    if (!parsed.success) {
      return jsonValidationError(parsed.error);
    }

    const connection = await prisma.whatsAppConnection.findFirst({
      where: {
        userId: id,
        isActive: true,
        ownerPhoneNumber: { not: null },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!connection?.ownerPhoneNumber) {
      return jsonError("This business does not have an owner WhatsApp number saved.", 409);
    }

    const sendResponse = await whatsappClient.sendMessage(connection.phoneNumberId, connection.ownerPhoneNumber, parsed.data.message, {
      accessToken: appEnv.WHATSAPP_MOCK_MODE ? undefined : decrypt(connection.accessToken),
    });
    const waMessageId = sendResponse.messages[0]?.id ?? `admin-outreach-${Date.now()}`;

    await prisma.$transaction([
      prisma.adminOutreach.create({
        data: {
          userId: id,
          message: parsed.data.message,
        },
      }),
      prisma.message.create({
        data: {
          userId: id,
          connectionId: connection.id,
          waMessageId,
          direction: MessageDirection.OUTBOUND,
          fromNumber: connection.phoneNumberId,
          toNumber: connection.ownerPhoneNumber,
          bodyText: parsed.data.message,
          status: MessageStatus.REPLIED,
          aiModelUsed: "admin-outreach",
          processedAt: new Date(),
        },
      }),
    ]);

    return jsonSuccess({ sent: true, waMessageId });
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(error.message, 401);
    if (error instanceof ForbiddenError) return jsonError(error.message, 403);
    if (error instanceof InvalidJsonError) return jsonError(error.message, 400);

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.admin.business.message", error);
    if (databaseErrorResponse) return databaseErrorResponse;

    logger.error("api.admin.business.message", "Failed to send admin outreach.", { error, userId: id });
    return jsonError("Failed to send owner message.", 500);
  }
}
