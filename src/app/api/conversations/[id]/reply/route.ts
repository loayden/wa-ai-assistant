import { MessageDirection, MessageStatus } from "@prisma/client";

import { UnauthorizedError, requireAppUser } from "@/lib/api/auth";
import { resolveConversationThread } from "@/lib/api/conversations";
import { InvalidJsonError, readJsonRequestBody } from "@/lib/api/request";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess, jsonValidationError } from "@/lib/api/response";
import type { MessagingChannel } from "@/lib/channels";
import { prisma } from "@/lib/prisma/client";
import { buildOutboundAttemptMetadata, type OutboundFailureClassification } from "@/lib/reliability/outbound";
import { markOutboundDeliveryFailed, markOutboundDeliverySent, sendTrackedChannelText } from "@/lib/reliability/outbox";
import { decrypt } from "@/lib/utils/encryption";
import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";
import { checkRateLimit } from "@/lib/utils/rateLimit";
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

async function createManualReplyFailureMessage(params: {
  userId: string;
  connectionId: string;
  channel: MessagingChannel;
  senderNumber: string;
  recipientId: string;
  messageText: string;
  externalThreadId: string | null;
  failure: OutboundFailureClassification;
  outboxId?: string;
}) {
  return prisma.message.create({
    data: {
      userId: params.userId,
      connectionId: params.connectionId,
      waMessageId: `${params.channel}:manual-failed:${crypto.randomUUID()}`,
      direction: MessageDirection.OUTBOUND,
      fromNumber: params.senderNumber,
      toNumber: params.recipientId,
      bodyText: params.messageText,
      aiReplyText: params.failure.userMessage,
      channel: params.channel,
      externalMessageId: null,
      externalThreadId: params.externalThreadId,
      status: MessageStatus.FAILED,
      aiModelUsed: "manual-reply",
      metadata: {
        ...(params.outboxId ? { outboxId: params.outboxId } : {}),
        outboundAttempt: buildOutboundAttemptMetadata({
          channel: params.channel,
          direction: "manual",
          stage: params.failure.retry.canRetry ? "failed" : "blocked",
          failure: params.failure,
        }),
      },
      processedAt: new Date(),
    },
  });
}

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireAppUser();
    const rateLimit = checkRateLimit({
      key: `manual-reply:${user.id}`,
      limit: 60,
      windowMs: 60_000,
      context: "api.conversations.reply",
    });

    if (!rateLimit.allowed) {
      return jsonError("طلبات كثيرة لإرسال الردود. انتظر قليلاً ثم حاول مرة أخرى.", 429, {
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      });
    }

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
    const senderNumber = getOutboundSenderNumber(channel, thread.connection);
    const externalThreadId = channel === "whatsapp" ? null : recipientId;
    const sendResult = await sendTrackedChannelText({
      userId: user.id,
      connectionId: thread.connection.id,
      relatedMessageId: thread.message.id,
      channel,
      direction: "manual",
      senderId: senderNumber,
      recipientId,
      bodyText: parsed.data.message,
      externalThreadId,
      accessToken,
      pageId: thread.connection.facebookPageId,
      phoneNumberId: channel === "whatsapp" ? thread.connection.phoneNumberId : senderNumber,
    });

    if (!sendResult.success) {
      const failedMessage = await createManualReplyFailureMessage({
        userId: user.id,
        connectionId: thread.connection.id,
        channel,
        senderNumber,
        recipientId,
        messageText: parsed.data.message,
        externalThreadId,
        failure: sendResult.failure,
        outboxId: sendResult.outbox.id,
      });

      await markOutboundDeliveryFailed({
        outbox: sendResult.outbox,
        failure: sendResult.failure,
        relatedMessageId: failedMessage.id,
      });

      logger.warn("api.conversations.reply", "Manual reply send failed and was recorded in the timeline.", {
        messageId: failedMessage.id,
        outboxId: sendResult.outbox.id,
        failureCode: sendResult.failure.code,
        retryable: sendResult.failure.retry.canRetry,
      });

      return jsonError(sendResult.failure.userMessage, sendResult.failure.retry.canRetry ? 503 : 400, {
        failure: sendResult.failure,
        messageId: failedMessage.id,
        outboxId: sendResult.outbox.id,
      });
    }
    const providerMessageId = sendResult.externalMessageId;
    const waMessageId = providerMessageId
      ? `${channel}:${providerMessageId}`
      : `${channel}:manual:${crypto.randomUUID()}`;

    const message = await prisma.message.create({
      data: {
        userId: user.id,
        connectionId: thread.connection.id,
        waMessageId,
        direction: MessageDirection.OUTBOUND,
        fromNumber: senderNumber,
        toNumber: recipientId,
        bodyText: parsed.data.message,
        channel,
        externalMessageId: providerMessageId,
        externalThreadId,
        status: MessageStatus.REPLIED,
        aiModelUsed: "manual-reply",
        metadata: {
          outboxId: sendResult.outbox.id,
          outboundAttempt: buildOutboundAttemptMetadata({
            channel,
            direction: "manual",
            stage: "sent",
            providerMessageId,
          }),
        },
        processedAt: new Date(),
      },
    });

    await markOutboundDeliverySent({
      outboxId: sendResult.outbox.id,
      providerMessageId,
      relatedMessageId: message.id,
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
