// FILE: src/app/api/whatsapp/send/route.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Direct outbound sends validate tenant ownership of the connection
 * before decrypting credentials or writing message history.
 */
import { MessageDirection, MessageStatus } from "@prisma/client";
import { z } from "zod";

import { requireAppUser, UnauthorizedError } from "@/lib/api/auth";
import { InvalidJsonError, readJsonRequestBody } from "@/lib/api/request";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess, jsonValidationError } from "@/lib/api/response";
import { whatsappClient } from "@/lib/api/whatsapp";
import { prisma } from "@/lib/prisma/client";
import { decrypt } from "@/lib/utils/encryption";
import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";
import { WhatsAppClientError } from "@/lib/whatsapp/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sendWhatsAppSchema = z
  .object({
    connectionId: z.string().uuid(),
    to: z.string().trim().min(6).max(32),
    message: z.string().trim().min(1).max(4096),
  })
  .strict();

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const body = await readJsonRequestBody(request);
    const parsed = sendWhatsAppSchema.safeParse(body);

    if (!parsed.success) {
      return jsonValidationError(parsed.error);
    }

    const connection = await prisma.whatsAppConnection.findFirst({
      where: {
        id: parsed.data.connectionId,
        userId: user.id,
        isActive: true,
      },
    });

    if (!connection) {
      return jsonError("WhatsApp connection not found.", 404);
    }

    const sendResponse = await whatsappClient.sendMessage(connection.phoneNumberId, parsed.data.to, parsed.data.message, {
      accessToken: appEnv.WHATSAPP_MOCK_MODE ? undefined : decrypt(connection.accessToken),
    });
    const waMessageId = sendResponse.messages[0]?.id;

    if (!waMessageId) {
      return jsonError("WhatsApp API did not return a message id.", 502);
    }

    const message = await prisma.message.create({
      data: {
        userId: user.id,
        connectionId: connection.id,
        waMessageId,
        direction: MessageDirection.OUTBOUND,
        fromNumber: connection.phoneNumberId,
        toNumber: parsed.data.to,
        bodyText: parsed.data.message,
        status: MessageStatus.REPLIED,
        processedAt: new Date(),
      },
    });

    return jsonSuccess({ message });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(error.message, 401);
    }

    if (error instanceof InvalidJsonError) {
      return jsonError(error.message, 400);
    }

    if (error instanceof WhatsAppClientError) {
      const metaCode = error.response?.error?.code;
      const details = error.response?.error?.error_data?.details;

      if (metaCode === 131030) {
        return jsonError(
          "رقم Meta الاختباري يمكنه مراسلة أرقام الاختبار المعتمدة فقط. أضف هذا الرقم كمستلم اختبار في Meta أو اربط رقم WhatsApp Business إنتاجي.",
          400,
        );
      }

      return jsonError(details || "رفضت Meta إرسال رسالة واتساب. راجع الرقم وصلاحيات الاتصال.", 502);
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.whatsapp.send", error);

    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }

    logger.error("api.whatsapp.send", "Failed to send WhatsApp message.", { error });
    return jsonError("فشل إرسال رسالة واتساب.", 500);
  }
}
