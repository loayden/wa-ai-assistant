import { MessageDirection, MessageStatus } from "@prisma/client";

import { DEFAULT_CSAT_MESSAGE } from "@/lib/assistant/csat";
import { UnauthorizedError, requireAppUser } from "@/lib/api/auth";
import { resolveConversationThread } from "@/lib/api/conversations";
import { whatsappClient } from "@/lib/api/whatsapp";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess, jsonValidationError } from "@/lib/api/response";
import { getOrCreateUserSettings } from "@/lib/api/settings";
import { prisma } from "@/lib/prisma/client";
import { decrypt } from "@/lib/utils/encryption";
import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";
import { conversationParamsSchema } from "@/lib/validators/conversations";
import { WhatsAppClientError } from "@/lib/whatsapp/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const user = await requireAppUser();
    const params = conversationParamsSchema.safeParse(await context.params);

    if (!params.success) {
      return jsonValidationError(params.error);
    }

    const thread = await resolveConversationThread(user.id, params.data.id);

    if (!thread || !thread.connection.isActive) {
      return jsonError("Conversation not found.", 404);
    }

    const settings = await getOrCreateUserSettings(user.id);
    const now = new Date();
    let ratingRequestedAt: Date | null = null;

    if (settings.csatEnabled) {
      const sendResponse = await whatsappClient.sendMessage(thread.connection.phoneNumberId, thread.customerPhone, DEFAULT_CSAT_MESSAGE, {
        accessToken: appEnv.WHATSAPP_MOCK_MODE ? undefined : decrypt(thread.connection.accessToken),
      });
      const waMessageId = sendResponse.messages[0]?.id;

      if (!waMessageId) {
        return jsonError("WhatsApp API did not return a rating request id.", 502);
      }

      ratingRequestedAt = now;

      await prisma.message.create({
        data: {
          userId: user.id,
          connectionId: thread.connection.id,
          waMessageId,
          direction: MessageDirection.OUTBOUND,
          fromNumber: thread.connection.phoneNumberId,
          toNumber: thread.customerPhone,
          bodyText: DEFAULT_CSAT_MESSAGE,
          status: MessageStatus.REPLIED,
          aiModelUsed: "csat-request",
          processedAt: now,
        },
      });
    }

    const handoff = await prisma.conversationHandoff.upsert({
      where: {
        userId_connectionId_customerPhone: {
          userId: user.id,
          connectionId: thread.connection.id,
          customerPhone: thread.customerPhone,
        },
      },
      create: {
        userId: user.id,
        connectionId: thread.connection.id,
        customerPhone: thread.customerPhone,
        active: false,
        resolvedAt: now,
        ratingRequestedAt,
      },
      update: {
        active: false,
        resolvedAt: now,
        ratingRequestedAt,
      },
    });

    return jsonSuccess({
      resolved: true,
      ratingRequested: Boolean(ratingRequestedAt),
      handoff: {
        id: handoff.id,
        active: handoff.active,
        resolvedAt: handoff.resolvedAt?.toISOString() ?? null,
        rating: handoff.rating,
        ratingRequestedAt: handoff.ratingRequestedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(error.message, 401);
    }

    if (error instanceof WhatsAppClientError) {
      const details = error.response?.error?.error_data?.details || error.response?.error?.message;

      return jsonError(details || "Meta rejected the rating request message.", 502);
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.conversations.resolve", error);

    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }

    logger.error("api.conversations.resolve", "Failed to resolve conversation.", { error });
    return jsonError("Failed to resolve conversation.", 500);
  }
}
