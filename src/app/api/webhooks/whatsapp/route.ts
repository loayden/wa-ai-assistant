// FILE: src/app/api/webhooks/whatsapp/route.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: WhatsApp webhooks are unauthenticated public endpoints, so they
 * verify Meta signatures, resolve tenant ownership by phone number id, and
 * enforce reply limits before generating or sending AI responses.
 */
import { MessageDirection, MessageStatus } from "@prisma/client";

import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess, jsonValidationError } from "@/lib/api/response";
import { buildFallbackMessage, getOrCreateUserSettings } from "@/lib/api/settings";
import { whatsappClient } from "@/lib/api/whatsapp";
import { generateAIReply } from "@/lib/openai/client";
import { prisma } from "@/lib/prisma/client";
import { decrypt } from "@/lib/utils/encryption";
import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";
import { handleOwnerCommand } from "@/lib/utils/ownerCommands";
import { checkSubscriptionLimit, incrementReplyCount } from "@/lib/utils/subscription";
import { inboundWebhookSchema, type InboundWhatsAppMessage } from "@/lib/validators/message";
import { webhookVerifySchema } from "@/lib/validators/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WebhookProcessingResult = {
  waMessageId: string;
  status: MessageStatus | "DUPLICATE" | "NO_CONNECTION";
  aiReplyText?: string;
};

function extractMessageBody(message: InboundWhatsAppMessage): string {
  switch (message.type) {
    case "text":
      return message.text.body;
    case "button":
      return message.button.text;
    case "interactive":
      return message.interactive.button_reply?.title ?? message.interactive.list_reply?.title ?? "Interactive reply";
    case "image":
      return message.image.caption ?? "[image message]";
    case "video":
      return message.video.caption ?? "[video message]";
    case "document":
      return message.document.caption ?? message.document.filename ?? "[document message]";
    case "audio":
      return "[audio message]";
    case "sticker":
      return "[sticker message]";
    case "location":
      return `Location: ${message.location.latitude}, ${message.location.longitude}`;
    case "contacts":
      return "[contact card message]";
    case "order":
      return message.order.text ?? "[order message]";
    case "reaction":
      return `Reaction ${message.reaction.emoji ?? ""} to ${message.reaction.message_id}`.trim();
    case "system":
      return "[system message]";
  }
}

function extractMediaType(message: InboundWhatsAppMessage): string | undefined {
  return ["image", "video", "document", "audio", "sticker"].includes(message.type) ? message.type : undefined;
}

function normalizePhoneNumber(value: string): string {
  return value.replace(/\D/g, "");
}

async function sendReply(params: {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  replyText: string;
}) {
  return whatsappClient.sendMessage(params.phoneNumberId, params.to, params.replyText, {
    accessToken: appEnv.WHATSAPP_MOCK_MODE ? undefined : decrypt(params.accessToken),
  });
}

async function processInboundMessage(params: {
  phoneNumberId: string;
  displayPhoneNumber: string;
  message: InboundWhatsAppMessage;
}): Promise<WebhookProcessingResult> {
  const existingMessage = await prisma.message.findUnique({
    where: { waMessageId: params.message.id },
    select: { id: true, status: true, aiReplyText: true },
  });

  if (existingMessage) {
    return {
      waMessageId: params.message.id,
      status: "DUPLICATE",
      aiReplyText: existingMessage.aiReplyText ?? undefined,
    };
  }

  const connection = await prisma.whatsAppConnection.findFirst({
    where: {
      phoneNumberId: params.phoneNumberId,
      isActive: true,
    },
    include: {
      user: {
        include: {
          settings: true,
        },
      },
    },
  });

  if (!connection) {
    logger.warn("api.webhooks.whatsapp", "No active WhatsApp connection matched inbound phone number id.", {
      phoneNumberId: params.phoneNumberId,
      waMessageId: params.message.id,
    });

    return {
      waMessageId: params.message.id,
      status: "NO_CONNECTION",
    };
  }

  const settings = connection.user.settings ?? (await getOrCreateUserSettings(connection.userId));
  const bodyText = extractMessageBody(params.message);
  const inboundMessage = await prisma.message.create({
    data: {
      userId: connection.userId,
      connectionId: connection.id,
      waMessageId: params.message.id,
      direction: MessageDirection.INBOUND,
      fromNumber: params.message.from,
      toNumber: params.displayPhoneNumber,
      bodyText,
      mediaType: extractMediaType(params.message),
      status: settings.autoReplyEnabled ? MessageStatus.PROCESSING : MessageStatus.IGNORED,
    },
  });

  // [ROLE: BACKEND ENGINEER]
  // Decision: Owner-originated messages act as control commands and must not
  // consume AI quota or continue into the reply-generation path.
  if (
    connection.ownerPhoneNumber &&
    normalizePhoneNumber(params.message.from) === normalizePhoneNumber(connection.ownerPhoneNumber)
  ) {
    const commandResult = await handleOwnerCommand(bodyText, connection.userId, prisma);

    if (commandResult.settingsUpdate) {
      await prisma.userSettings.upsert({
        where: { userId: connection.userId },
        create: {
          userId: connection.userId,
          systemPrompt: commandResult.settingsUpdate.systemPrompt ?? settings.systemPrompt,
          autoReplyEnabled: commandResult.settingsUpdate.autoReplyEnabled ?? settings.autoReplyEnabled,
          language: settings.language,
          businessName: settings.businessName,
          businessContext: settings.businessContext,
          fallbackMessage: settings.fallbackMessage,
          maxReplyLength: settings.maxReplyLength,
        },
        update: commandResult.settingsUpdate,
      });
    }

    try {
      await sendReply({
        phoneNumberId: params.phoneNumberId,
        accessToken: connection.accessToken,
        to: params.message.from,
        replyText: commandResult.confirmationMessage,
      });
    } catch (error) {
      logger.error("api.webhooks.whatsapp", "Owner command confirmation send failed.", {
        error,
        waMessageId: inboundMessage.waMessageId,
      });
    }

    await prisma.message.update({
      where: { id: inboundMessage.id },
      data: {
        status: MessageStatus.IGNORED,
        processedAt: new Date(),
      },
    });

    return {
      waMessageId: inboundMessage.waMessageId,
      status: MessageStatus.IGNORED,
      aiReplyText: commandResult.confirmationMessage,
    };
  }

  if (!settings.autoReplyEnabled) {
    return {
      waMessageId: inboundMessage.waMessageId,
      status: MessageStatus.IGNORED,
    };
  }

  const limit = await checkSubscriptionLimit(connection.userId);

  if (!limit.allowed) {
    await prisma.message.update({
      where: { id: inboundMessage.id },
      data: {
        status: MessageStatus.IGNORED,
        processedAt: new Date(),
      },
    });

    return {
      waMessageId: inboundMessage.waMessageId,
      status: MessageStatus.IGNORED,
    };
  }

  try {
    const aiReply = await generateAIReply({
      systemPrompt: settings.systemPrompt,
      userMessage: bodyText,
      settings,
    });
    const sendResponse = await sendReply({
      phoneNumberId: params.phoneNumberId,
      accessToken: connection.accessToken,
      to: params.message.from,
      replyText: aiReply.replyText,
    });
    const outboundWaMessageId = sendResponse.messages[0]?.id;

    if (!outboundWaMessageId) {
      throw new Error("WhatsApp API did not return an outbound message id.");
    }

    await prisma.$transaction([
      prisma.message.update({
        where: { id: inboundMessage.id },
        data: {
          status: MessageStatus.REPLIED,
          aiReplyText: aiReply.replyText,
          aiModelUsed: aiReply.modelUsed,
          aiTokensUsed: aiReply.tokensUsed,
          processedAt: new Date(),
        },
      }),
      prisma.message.create({
        data: {
          userId: connection.userId,
          connectionId: connection.id,
          waMessageId: outboundWaMessageId,
          direction: MessageDirection.OUTBOUND,
          fromNumber: params.displayPhoneNumber,
          toNumber: params.message.from,
          bodyText: aiReply.replyText,
          status: MessageStatus.REPLIED,
          aiModelUsed: aiReply.modelUsed,
          aiTokensUsed: aiReply.tokensUsed,
          processedAt: new Date(),
        },
      }),
    ]);

    await incrementReplyCount(connection.userId);

    return {
      waMessageId: inboundMessage.waMessageId,
      status: MessageStatus.REPLIED,
      aiReplyText: aiReply.replyText,
    };
  } catch (error) {
    const fallbackMessage = buildFallbackMessage(settings);

    logger.error("api.webhooks.whatsapp", "AI reply processing failed; sending fallback when possible.", {
      error,
      waMessageId: inboundMessage.waMessageId,
    });

    try {
      const sendResponse = await sendReply({
        phoneNumberId: params.phoneNumberId,
        accessToken: connection.accessToken,
        to: params.message.from,
        replyText: fallbackMessage,
      });
      const outboundWaMessageId = sendResponse.messages[0]?.id;

      if (outboundWaMessageId) {
        await prisma.message.create({
          data: {
            userId: connection.userId,
            connectionId: connection.id,
            waMessageId: outboundWaMessageId,
            direction: MessageDirection.OUTBOUND,
            fromNumber: params.displayPhoneNumber,
            toNumber: params.message.from,
            bodyText: fallbackMessage,
            status: MessageStatus.REPLIED,
            processedAt: new Date(),
          },
        });
      }
    } catch (fallbackError) {
      logger.error("api.webhooks.whatsapp", "Fallback WhatsApp send failed.", {
        error: fallbackError,
        waMessageId: inboundMessage.waMessageId,
      });
    }

    await prisma.message.update({
      where: { id: inboundMessage.id },
      data: {
        status: MessageStatus.FAILED,
        aiReplyText: fallbackMessage,
        processedAt: new Date(),
      },
    });

    return {
      waMessageId: inboundMessage.waMessageId,
      status: MessageStatus.FAILED,
      aiReplyText: fallbackMessage,
    };
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = webhookVerifySchema.safeParse(Object.fromEntries(searchParams));

  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  const storedConnection = await prisma.whatsAppConnection.findFirst({
    where: { webhookVerifyToken: parsed.data["hub.verify_token"] },
    select: { id: true },
  });

  if (parsed.data["hub.verify_token"] !== appEnv.WHATSAPP_VERIFY_TOKEN && !storedConnection) {
    return new Response("Forbidden", { status: 403 });
  }

  return new Response(parsed.data["hub.challenge"], { status: 200 });
}

export async function POST(request: Request) {
  const rawPayload = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!whatsappClient.verifyWebhookSignature(rawPayload, signature)) {
    return jsonError("Invalid WhatsApp webhook signature.", 403);
  }

  let payload: unknown;

  try {
    payload = JSON.parse(rawPayload);
  } catch (error) {
    logger.warn("api.webhooks.whatsapp", "Invalid WhatsApp webhook JSON payload.", { error });
    return jsonError("Invalid JSON payload.", 400);
  }

  const parsed = inboundWebhookSchema.safeParse(payload);

  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  const results: WebhookProcessingResult[] = [];

  try {
    for (const entry of parsed.data.entry) {
      for (const change of entry.changes) {
        for (const message of change.value.messages) {
          results.push(
            await processInboundMessage({
              phoneNumberId: change.value.metadata.phone_number_id,
              displayPhoneNumber: change.value.metadata.display_phone_number,
              message,
            }),
          );
        }
      }
    }

    return jsonSuccess({ processed: results });
  } catch (error) {
    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.webhooks.whatsapp", error);

    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }

    logger.error("api.webhooks.whatsapp", "WhatsApp webhook processing failed.", { error });
    return jsonError("WhatsApp webhook processing failed.", 500);
  }
}
