import { MessageDirection, MessageStatus } from "@prisma/client";
import { z } from "zod";

import { UnauthorizedError, requireAppUser } from "@/lib/api/auth";
import { InvalidJsonError, readJsonRequestBody } from "@/lib/api/request";
import { whatsappClient } from "@/lib/api/whatsapp";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess, jsonValidationError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma/client";
import { decrypt } from "@/lib/utils/encryption";
import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";
import { WhatsAppClientError } from "@/lib/whatsapp/client";

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

const correctionSchema = z
  .object({
    correctReply: z.string().trim().min(1).max(4096),
  })
  .strict();

function serializeCorrection(correction: {
  id: string;
  originalCustomerMessage: string;
  wrongAiReply: string;
  correctReply: string;
  createdAt: Date;
}) {
  return {
    ...correction,
    createdAt: correction.createdAt.toISOString(),
  };
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireAppUser();
    const params = paramsSchema.safeParse(await context.params);

    if (!params.success) {
      return jsonValidationError(params.error);
    }

    const parsed = correctionSchema.safeParse(await readJsonRequestBody(request));

    if (!parsed.success) {
      return jsonValidationError(parsed.error);
    }

    const message = await prisma.message.findFirst({
      where: {
        id: params.data.id,
        userId: user.id,
        direction: MessageDirection.OUTBOUND,
      },
      select: {
        id: true,
        userId: true,
        connectionId: true,
        direction: true,
        toNumber: true,
        bodyText: true,
        aiReplyText: true,
        createdAt: true,
        connection: true,
      },
    });

    if (!message) {
      return jsonError("AI reply not found.", 404);
    }

    if (!message.connection.isActive) {
      return jsonError("The WhatsApp connection for this thread is not active.", 400);
    }

    const previousInbound = await prisma.message.findFirst({
      where: {
        userId: user.id,
        connectionId: message.connectionId,
        direction: MessageDirection.INBOUND,
        fromNumber: message.toNumber,
        createdAt: {
          lte: message.createdAt,
        },
      },
      orderBy: { createdAt: "desc" },
      select: { bodyText: true },
    });

    await whatsappClient.sendMessage(message.connection.phoneNumberId, message.toNumber, parsed.data.correctReply, {
      accessToken: appEnv.WHATSAPP_MOCK_MODE ? undefined : decrypt(message.connection.accessToken),
    });

    const correction = await prisma.$transaction(async (tx) => {
      const savedCorrection = await tx.aiCorrection.create({
        data: {
          userId: user.id,
          originalCustomerMessage: previousInbound?.bodyText ?? "Unknown customer message",
          wrongAiReply: message.aiReplyText ?? message.bodyText,
          correctReply: parsed.data.correctReply,
        },
      });

      await tx.message.update({
        where: { id: message.id },
        data: {
          bodyText: parsed.data.correctReply,
          aiReplyText: parsed.data.correctReply,
          aiModelUsed: "human-corrected",
          status: MessageStatus.REPLIED,
          processedAt: new Date(),
        },
      });

      return savedCorrection;
    });

    return jsonSuccess({
      corrected: true,
      correction: serializeCorrection(correction),
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(error.message, 401);
    if (error instanceof InvalidJsonError) return jsonError(error.message, 400);

    if (error instanceof WhatsAppClientError) {
      const details = error.response?.error?.error_data?.details || error.response?.error?.message;
      return jsonError(details || "Meta rejected the corrected WhatsApp reply.", 502);
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.messages.correct", error);
    if (databaseErrorResponse) return databaseErrorResponse;

    logger.error("api.messages.correct", "Failed to correct AI message.", { error });
    return jsonError("Failed to correct AI message.", 500);
  }
}
