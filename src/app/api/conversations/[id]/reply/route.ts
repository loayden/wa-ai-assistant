import { MessageDirection, MessageStatus } from "@prisma/client";

import { UnauthorizedError, requireAppUser } from "@/lib/api/auth";
import { resolveConversationThread } from "@/lib/api/conversations";
import { InvalidJsonError, readJsonRequestBody } from "@/lib/api/request";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess, jsonValidationError } from "@/lib/api/response";
import { getAdapter, type MessagingChannel } from "@/lib/channels";
import { prisma } from "@/lib/prisma/client";
import { decrypt } from "@/lib/utils/encryption";
import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";
import { conversationParamsSchema, manualConversationReplySchema } from "@/lib/validators/conversations";
import { WhatsAppClientError } from "@/lib/whatsapp/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isMessagingChannel(value: string): value is MessagingChannel {
  return value === "whatsapp" || value === "instagram" || value === "messenger";
}

function getOutboundSenderNumber(channel: MessagingChannel, connection: {
  facebookPageId: string | null;
  instagramAccountId: string | null;
  phoneNumberId: string;
}) {
  if (channel === "whatsapp") {
    return connection.phoneNumberId;
  }

  if (channel === "instagram") {
    return connection.instagramAccountId ?? connection.phoneNumberId;
  }

  return connection.facebookPageId ?? connection.phoneNumberId;
}

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireAppUser();
    const params = conversationParamsSchema.safeParse(await context.params);

    if (!params.success) {
      return jsonValidationError(params.error);
    }

    const body = await readJsonRequestBody(request);
    const parsed = manualConversationReplySchema.safeParse(body);

    if (!parsed.success) {
      return jsonValidationError(parsed.error);
    }

    const thread = await resolveConversationThread(user.id, params.data.id);

    if (!thread || !thread.connection.isActive) {
      return jsonError("لم يتم العثور على المحادثة.", 404);
    }

    const channel = isMessagingChannel(thread.connection.channel) ? thread.connection.channel : "whatsapp";
    const accessToken =
      channel === "whatsapp"
        ? appEnv.WHATSAPP_MOCK_MODE
          ? ""
          : decrypt(thread.connection.accessToken)
        : decrypt(thread.connection.pageAccessTokenEncrypted ?? thread.connection.accessToken);
    const recipientId = channel === "whatsapp" ? thread.customerPhone : thread.message.externalThreadId ?? thread.customerPhone;
    const sendResult = await getAdapter(channel).sendText({
      connectionId: thread.connection.id,
      recipientId,
      text: parsed.data.message,
      accessToken,
      pageId: thread.connection.facebookPageId ?? undefined,
      phoneNumberId: thread.connection.phoneNumberId,
    });
    const waMessageId = sendResult.externalMessageId
      ? `${channel}:${sendResult.externalMessageId}`
      : `${channel}:manual:${crypto.randomUUID()}`;

    if (!sendResult.success) {
      return jsonError(sendResult.error || "رفضت Meta إرسال الرد اليدوي.", 502);
    }

    const message = await prisma.message.create({
      data: {
        userId: user.id,
        connectionId: thread.connection.id,
        waMessageId,
        direction: MessageDirection.OUTBOUND,
        fromNumber: getOutboundSenderNumber(channel, thread.connection),
        toNumber: recipientId,
        bodyText: parsed.data.message,
        channel,
        externalMessageId: sendResult.externalMessageId,
        externalThreadId: channel === "whatsapp" ? null : recipientId,
        status: MessageStatus.REPLIED,
        aiModelUsed: "manual-reply",
        processedAt: new Date(),
      },
    });

    return jsonSuccess({
      messageSent: true,
      message,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(error.message, 401);
    }

    if (error instanceof InvalidJsonError) {
      return jsonError(error.message, 400);
    }

    if (error instanceof WhatsAppClientError) {
      const metaCode = error.response?.error?.code;
      const details = error.response?.error?.error_data?.details || error.response?.error?.message;

      if (metaCode === 131030) {
        return jsonError(
          "رقم Meta الاختباري يمكنه مراسلة أرقام الاختبار المعتمدة فقط. استخدم رقم WhatsApp Business إنتاجي للعملاء الحقيقيين.",
          400,
        );
      }

      return jsonError(details || "رفضت Meta إرسال الرد اليدوي عبر واتساب.", 502);
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.conversations.reply", error);

    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }

    logger.error("api.conversations.reply", "Failed to send manual conversation reply.", { error });
    return jsonError("فشل إرسال الرد اليدوي.", 500);
  }
}
