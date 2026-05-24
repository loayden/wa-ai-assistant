// FILE: src/app/api/webhooks/whatsapp/route.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: WhatsApp webhooks are unauthenticated public endpoints, so they
 * verify Meta signatures, resolve tenant ownership by phone number id, and
 * enforce reply limits before generating or sending AI responses.
 */
import { MessageDirection, MessageStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";

import { CSAT_THANK_YOU_MESSAGE, parseCsatRating } from "@/lib/assistant/csat";
import { isWithinWorkingHours } from "@/lib/assistant/working-hours";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess, jsonValidationError } from "@/lib/api/response";
import { buildFallbackMessage, getOrCreateUserSettings, updateUserSettings } from "@/lib/api/settings";
import { whatsappClient } from "@/lib/api/whatsapp";
import { preprocessMessage } from "@/lib/ai/franco";
import { detectLeadIntent } from "@/lib/ai/leads";
import { detectAngryTone } from "@/lib/ai/mood";
import { parseOrderTag, stripOrderTag } from "@/lib/ai/order-extraction";
import { detectTopicFromText, findRoutingRuleForTopic } from "@/lib/ai/topic-routing";
import { shouldSendNotification } from "@/lib/notifications/preferences";
import { sendConversationNotificationOnce } from "@/lib/notifications/events";
import { AIReplyError, generateAIReply } from "@/lib/openai/client";
import { prisma } from "@/lib/prisma/client";
import { sendEmail } from "@/lib/resend/client";
import { decrypt } from "@/lib/utils/encryption";
import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";
import { handleOwnerCommand } from "@/lib/utils/ownerCommands";
import { checkSubscriptionLimit, incrementReplyCount } from "@/lib/utils/subscription";
import { inboundWebhookSchema, type InboundWhatsAppMessage } from "@/lib/validators/message";
import { webhookVerifySchema } from "@/lib/validators/whatsapp";
import { transcribeWhatsAppAudio } from "@/lib/whatsapp/voice";
import { WhatsAppClientError } from "@/lib/whatsapp/client";

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

function extractAudioMediaId(message: InboundWhatsAppMessage): string | null {
  return message.type === "audio" ? message.audio.id : null;
}

function normalizePhoneNumber(value: string): string {
  return value.replace(/\D/g, "");
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };

    return entities[char] ?? char;
  });
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

async function detectAndSaveLead(params: {
  userId: string;
  connectionId: string;
  messageId: string;
  customerPhone: string;
  messageText: string;
}) {
  const result = detectLeadIntent(params.messageText);

  if (!result.isLead || !result.interest) {
    return { created: false as const };
  }

  const existing = await prisma.lead.findFirst({
    where: {
      userId: params.userId,
      connectionId: params.connectionId,
      customerPhone: params.customerPhone,
    },
    select: { id: true },
  });

  if (existing) {
    return { created: false as const };
  }

  const lead = await prisma.lead.create({
    data: {
      userId: params.userId,
      connectionId: params.connectionId,
      messageId: params.messageId,
      customerPhone: params.customerPhone,
      interest: result.interest,
      channel: "whatsapp",
    },
  });

  return {
    created: true as const,
    lead,
    interest: result.interest,
  };
}

async function createDetectedOrder(params: {
  userId: string;
  connectionId: string;
  customerPhone: string;
  aiReplyText: string;
  ownerEmail?: string | null;
  businessName: string | null;
}) {
  const parsedOrder = parseOrderTag(params.aiReplyText);

  if (!parsedOrder) {
    return { created: false as const };
  }

  const order = await prisma.order.create({
    data: {
      userId: params.userId,
      connectionId: params.connectionId,
      customerPhone: params.customerPhone,
      items: parsedOrder.items,
      subtotal: parsedOrder.subtotal,
      notes: parsedOrder.notes,
      status: "new",
    },
  });

  if (params.ownerEmail) {
    try {
      await sendEmail({
        to: params.ownerEmail,
        subject: "طلب جديد من واتساب",
        html: `<p>وصل طلب جديد عبر kallem.</p><p><strong>العميل:</strong> ${escapeHtml(params.customerPhone)}</p><p><strong>الإجمالي:</strong> ${(parsedOrder.subtotal / 100).toFixed(0)} جنيه</p><p><a href="${appEnv.NEXT_PUBLIC_APP_URL}/orders">افتح الطلبات</a></p>`,
      });
    } catch (error) {
      logger.warn("api.webhooks.whatsapp", "Order notification failed without blocking reply.", { error, orderId: order.id });
    }
  }

  return { created: true as const, order };
}

function describeWhatsAppSendFailure(error: unknown): string | null {
  if (!(error instanceof WhatsAppClientError)) {
    return null;
  }

  const metaCode = error.response?.error?.code;
  const details = error.response?.error?.error_data?.details || error.response?.error?.message;

  if (metaCode === 131030) {
    return "تم تجهيز الرد، لكن Meta منعت الإرسال لأن الرقم رقم اختباري. أضف رقم العميل كمستلم اختبار داخل Meta، أو اربط رقم WhatsApp Business إنتاجي للعملاء الحقيقيين.";
  }

  if (details) {
    return `تم تجهيز الرد، لكن Meta منعت الإرسال: ${details}`;
  }

  return "تم تجهيز الرد، لكن Meta رفضت إرسال رسالة واتساب. راجع الرقم المتصل، صلاحيات Access Token، وهل الرقم جاهز للإنتاج.";
}

function describeAutomaticReplyFailure(primaryError: unknown, fallbackError: unknown): string {
  const whatsappFailure = describeWhatsAppSendFailure(fallbackError) ?? describeWhatsAppSendFailure(primaryError);

  if (whatsappFailure) {
    return whatsappFailure;
  }

  if (primaryError instanceof AIReplyError) {
    if (primaryError.code === "OPENAI_RATE_LIMIT") {
      return "لم يتم إرسال الرد التلقائي لأن رصيد أو حد مزود الذكاء الاصطناعي انتهى. أضف رصيد OpenAI أو استبدل مفتاح API.";
    }

    if (primaryError.code === "OPENAI_TIMEOUT") {
      return "لم يتم إرسال الرد التلقائي لأن مزود الذكاء الاصطناعي تأخر في الاستجابة. حاول مرة أخرى أو راجع حالة OpenAI والفوترة.";
    }

    return "لم يتم إرسال الرد التلقائي لأن مزود الذكاء الاصطناعي رفض الطلب. راجع مفتاح OpenAI، الموديل، الفوترة، وحدود الاستخدام.";
  }

  return "لم يتم إرسال الرد التلقائي. راجع فوترة OpenAI وحدود الاستخدام، صلاحيات رمز واتساب، وهل تستخدم رقم WhatsApp Business إنتاجي.";
}

async function maybeNotifyOwner(params: {
  userId: string;
  ownerEmail: string | null | undefined;
  connectionId: string;
  customerPhone: string;
  event: "angry" | "lead" | "handoff" | "ai_failed";
  subject: string;
  html: string;
  notificationPrefs: Parameters<typeof shouldSendNotification>[0];
}) {
  if (!params.ownerEmail || !shouldSendNotification(params.notificationPrefs, params.event)) {
    return;
  }

  await sendConversationNotificationOnce({
    userId: params.userId,
    ownerEmail: params.ownerEmail,
    connectionId: params.connectionId,
    customerPhone: params.customerPhone,
    event: params.event,
    subject: params.subject,
    html: params.html,
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
    select: {
      id: true,
      userId: true,
      phoneNumberId: true,
      accessToken: true,
      ownerPhoneNumber: true,
      user: {
        select: {
          email: true,
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

  const settings = await getOrCreateUserSettings(connection.userId);
  let bodyText = extractMessageBody(params.message);
  let aiInputText = bodyText;
  let mediaUrl: string | null = null;
  const messageMetadata: Record<string, Prisma.InputJsonValue> = {};
  const audioMediaId = extractAudioMediaId(params.message);

  if (audioMediaId) {
    messageMetadata.original_type = "audio";

    if (appEnv.WHATSAPP_MOCK_MODE) {
      messageMetadata.type = "voice_transcribed";
      messageMetadata.transcription_mocked = true;
      bodyText = "رسالة صوتية تجريبية";
      aiInputText = bodyText;
    } else {
      try {
        const decryptedAccessToken = decrypt(connection.accessToken);
        const transcription = await transcribeWhatsAppAudio({
          mediaId: audioMediaId,
          accessToken: decryptedAccessToken,
        });

        bodyText = transcription.transcript;
        aiInputText = transcription.transcript;
        mediaUrl = transcription.mediaUrl;
        messageMetadata.type = "voice_transcribed";
        messageMetadata.mime_type = transcription.mimeType;
      } catch (error) {
        logger.warn("api.webhooks.whatsapp", "Voice message transcription failed.", {
          error,
          waMessageId: params.message.id,
        });
        messageMetadata.type = "voice_transcription_failed";
        bodyText = "[voice message could not be transcribed]";
        aiInputText = bodyText;
      }
    }
  }

  const preprocessed = await preprocessMessage(aiInputText);
  aiInputText = preprocessed.processedText;

  if (preprocessed.wasFranco) {
    messageMetadata.franco_detected = true;
    messageMetadata.original_franco = bodyText;
    messageMetadata.normalized_text = aiInputText;
  }

  const inboundMessage = await prisma.message.create({
    data: {
      userId: connection.userId,
      connectionId: connection.id,
      waMessageId: params.message.id,
      direction: MessageDirection.INBOUND,
      fromNumber: params.message.from,
      toNumber: params.displayPhoneNumber,
      bodyText,
      mediaUrl,
      mediaType: extractMediaType(params.message),
      metadata: messageMetadata,
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
      await updateUserSettings(connection.userId, commandResult.settingsUpdate);
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

  const conversationState = await prisma.conversationHandoff.findUnique({
    where: {
      userId_connectionId_customerPhone: {
        userId: connection.userId,
        connectionId: connection.id,
        customerPhone: params.message.from,
      },
    },
    select: {
      id: true,
      active: true,
      rating: true,
      ratingRequestedAt: true,
      resolvedAt: true,
    },
  });
  const csatRating = parseCsatRating(bodyText);

  if (conversationState?.ratingRequestedAt && !conversationState.rating && csatRating) {
    let outboundWaMessageId: string | null = null;

    try {
      const sendResponse = await sendReply({
        phoneNumberId: params.phoneNumberId,
        accessToken: connection.accessToken,
        to: params.message.from,
        replyText: CSAT_THANK_YOU_MESSAGE,
      });
      outboundWaMessageId = sendResponse.messages[0]?.id ?? null;
    } catch (error) {
      logger.warn("api.webhooks.whatsapp", "CSAT thank-you message failed without losing the rating.", {
        error,
        waMessageId: inboundMessage.waMessageId,
      });
    }

    await prisma.conversationHandoff.update({
      where: { id: conversationState.id },
      data: {
        rating: csatRating,
        resolvedAt: new Date(),
      },
    });
    await prisma.message.update({
      where: { id: inboundMessage.id },
      data: {
        status: MessageStatus.REPLIED,
        processedAt: new Date(),
      },
    });

    if (outboundWaMessageId) {
      await prisma.message.create({
        data: {
          userId: connection.userId,
          connectionId: connection.id,
          waMessageId: outboundWaMessageId,
          direction: MessageDirection.OUTBOUND,
          fromNumber: params.displayPhoneNumber,
          toNumber: params.message.from,
          bodyText: CSAT_THANK_YOU_MESSAGE,
          status: MessageStatus.REPLIED,
          aiModelUsed: "csat-thank-you",
          processedAt: new Date(),
        },
      });
    }

    return {
      waMessageId: inboundMessage.waMessageId,
      status: MessageStatus.REPLIED,
      aiReplyText: CSAT_THANK_YOU_MESSAGE,
    };
  }

  if (detectAngryTone(aiInputText)) {
    try {
      await maybeNotifyOwner({
        userId: connection.userId,
        ownerEmail: connection.user.email,
        connectionId: connection.id,
        customerPhone: params.message.from,
        event: "angry",
        subject: "عميل يحتاج اهتمامك",
        html: `<p>وصلت رسالة قد تحتاج تدخل صاحب النشاط.</p><p><strong>الرسالة:</strong> ${escapeHtml(bodyText)}</p><p><a href="${appEnv.NEXT_PUBLIC_APP_URL}/messages">افتح صندوق الرسائل</a></p>`,
        notificationPrefs: settings.notificationPrefs,
      });
    } catch (error) {
      logger.warn("api.webhooks.whatsapp", "Angry-customer notification failed without blocking reply.", { error });
    }
  }

  if (!settings.autoReplyEnabled) {
    return {
      waMessageId: inboundMessage.waMessageId,
      status: MessageStatus.IGNORED,
    };
  }

  if (conversationState?.active) {
    await prisma.message.update({
      where: { id: inboundMessage.id },
      data: {
        status: MessageStatus.RECEIVED,
        processedAt: new Date(),
      },
    });

    return {
      waMessageId: inboundMessage.waMessageId,
      status: MessageStatus.RECEIVED,
    };
  }

  if (!isWithinWorkingHours(settings)) {
    const recentOffHours = await prisma.message.findFirst({
      where: {
        userId: connection.userId,
        connectionId: connection.id,
        direction: MessageDirection.OUTBOUND,
        toNumber: params.message.from,
        aiModelUsed: "off-hours",
        createdAt: {
          gte: new Date(Date.now() - 6 * 60 * 60 * 1000),
        },
      },
      select: { id: true },
    });

    if (recentOffHours) {
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

    const sendResponse = await sendReply({
      phoneNumberId: params.phoneNumberId,
      accessToken: connection.accessToken,
      to: params.message.from,
      replyText: settings.offHoursMessage,
    });
    const outboundWaMessageId = sendResponse.messages[0]?.id;

    if (!outboundWaMessageId) {
      throw new Error("WhatsApp API did not return an off-hours message id.");
    }

    await prisma.$transaction([
      prisma.message.update({
        where: { id: inboundMessage.id },
        data: {
          status: MessageStatus.REPLIED,
          aiReplyText: settings.offHoursMessage,
          aiModelUsed: "off-hours",
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
          bodyText: settings.offHoursMessage,
          status: MessageStatus.REPLIED,
          aiModelUsed: "off-hours",
          processedAt: new Date(),
        },
      }),
    ]);

    return {
      waMessageId: inboundMessage.waMessageId,
      status: MessageStatus.REPLIED,
      aiReplyText: settings.offHoursMessage,
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
    const routingRules = await prisma.routingRule.findMany({
      where: {
        userId: connection.userId,
        isActive: true,
      },
      select: {
        id: true,
        topic: true,
        keywords: true,
        action: true,
        targetEmail: true,
        targetPhone: true,
        customAiInstruction: true,
        isActive: true,
      },
    });
    const detectedTopic = detectTopicFromText(aiInputText);
    const routingRule = findRoutingRuleForTopic({
      message: aiInputText,
      rules: routingRules,
      topic: detectedTopic,
    });
    const extraInstructions: string[] = [];

    if (routingRule) {
      if (routingRule.action === "handoff") {
        const handoff = await prisma.conversationHandoff.upsert({
          where: {
            userId_connectionId_customerPhone: {
              userId: connection.userId,
              connectionId: connection.id,
              customerPhone: params.message.from,
            },
          },
          update: {
            active: true,
            handoffAt: new Date(),
            resumedAt: null,
          },
          create: {
            userId: connection.userId,
            connectionId: connection.id,
            customerPhone: params.message.from,
            active: true,
            handoffAt: new Date(),
          },
        });
        const handoffReply = "سيتواصل معك أحد المختصين قريباً.";
        const sendResponse = await sendReply({
          phoneNumberId: params.phoneNumberId,
          accessToken: connection.accessToken,
          to: params.message.from,
          replyText: handoffReply,
        });
        const outboundWaMessageId = sendResponse.messages[0]?.id;

        await prisma.$transaction([
          prisma.message.update({
            where: { id: inboundMessage.id },
            data: {
              status: MessageStatus.REPLIED,
              aiReplyText: handoffReply,
              aiModelUsed: "topic-routing-handoff",
              processedAt: new Date(),
            },
          }),
          ...(outboundWaMessageId
            ? [
                prisma.message.create({
                  data: {
                    userId: connection.userId,
                    connectionId: connection.id,
                    waMessageId: outboundWaMessageId,
                    direction: MessageDirection.OUTBOUND,
                    fromNumber: params.displayPhoneNumber,
                    toNumber: params.message.from,
                    bodyText: handoffReply,
                    status: MessageStatus.REPLIED,
                    aiModelUsed: "topic-routing-handoff",
                    processedAt: new Date(),
                  },
                }),
              ]
            : []),
        ]);

        try {
          await maybeNotifyOwner({
            userId: connection.userId,
            ownerEmail: connection.user.email,
            connectionId: connection.id,
            customerPhone: params.message.from,
            event: "handoff",
            subject: "محادثة تحتاج تدخل بشري",
            html: `<p>تم تحويل محادثة للمتابعة البشرية بسبب قاعدة توجيه.</p><p><strong>الموضوع:</strong> ${escapeHtml(detectedTopic)}</p><p><strong>الرسالة:</strong> ${escapeHtml(bodyText)}</p><p><a href="${appEnv.NEXT_PUBLIC_APP_URL}/messages">افتح المحادثة</a></p>`,
            notificationPrefs: settings.notificationPrefs,
          });
        } catch (error) {
          logger.warn("api.webhooks.whatsapp", "Routing handoff notification failed without blocking reply.", {
            error,
            handoffId: handoff.id,
          });
        }

        return {
          waMessageId: inboundMessage.waMessageId,
          status: MessageStatus.REPLIED,
          aiReplyText: handoffReply,
        };
      }

      if (routingRule.action === "notify_email" && routingRule.targetEmail) {
        try {
          await sendEmail({
            to: routingRule.targetEmail,
            subject: `رسالة جديدة — ${detectedTopic}`,
            html: `<p>وصلت رسالة تحتاج متابعة.</p><p><strong>العميل:</strong> ${escapeHtml(params.message.from)}</p><p><strong>الرسالة:</strong> ${escapeHtml(bodyText)}</p>`,
          });
        } catch (error) {
          logger.warn("api.webhooks.whatsapp", "Routing email notification failed without blocking reply.", { error });
        }
      }

      if (routingRule.action === "notify_whatsapp" && routingRule.targetPhone) {
        try {
          await sendReply({
            phoneNumberId: params.phoneNumberId,
            accessToken: connection.accessToken,
            to: routingRule.targetPhone,
            replyText: `رسالة جديدة (${detectedTopic})\nمن: ${params.message.from}\n${bodyText}`,
          });
        } catch (error) {
          logger.warn("api.webhooks.whatsapp", "Routing WhatsApp notification failed without blocking reply.", { error });
        }
      }

      if (routingRule.action === "ai_reply" && routingRule.customAiInstruction?.trim()) {
        extraInstructions.push(routingRule.customAiInstruction.trim());
      }
    }

    const aiReply = await generateAIReply({
      systemPrompt: settings.systemPrompt,
      userMessage: aiInputText,
      settings,
      extraInstructions,
      forceEgyptianArabic: preprocessed.wasFranco,
    });
    const customerReplyText = stripOrderTag(aiReply.replyText) || buildFallbackMessage(settings);

    try {
      await createDetectedOrder({
        userId: connection.userId,
        connectionId: connection.id,
        customerPhone: params.message.from,
        aiReplyText: aiReply.replyText,
        ownerEmail: connection.user.email,
        businessName: settings.businessName,
      });
    } catch (orderError) {
      logger.warn("api.webhooks.whatsapp", "Order extraction failed without blocking the reply.", {
        error: orderError,
        waMessageId: inboundMessage.waMessageId,
      });
    }

    try {
      const leadResult = await detectAndSaveLead({
        userId: connection.userId,
        connectionId: connection.id,
        messageId: inboundMessage.id,
        customerPhone: params.message.from,
        messageText: aiInputText,
      });

      if (leadResult.created) {
        await maybeNotifyOwner({
          userId: connection.userId,
          ownerEmail: connection.user.email,
          connectionId: connection.id,
          customerPhone: params.message.from,
          event: "lead",
          subject: "عميل محتمل جديد",
          html: `<p>اكتشف kallem عميلاً محتملاً جديداً.</p><p><strong>الاهتمام:</strong> ${escapeHtml(leadResult.interest)}</p><p><a href="${appEnv.NEXT_PUBLIC_APP_URL}/leads">عرض العملاء المحتملين</a></p>`,
          notificationPrefs: settings.notificationPrefs,
        });
      }
    } catch (leadError) {
      logger.warn("api.webhooks.whatsapp", "Lead detection failed without blocking the reply.", {
        error: leadError,
        waMessageId: inboundMessage.waMessageId,
      });
    }

    const sendResponse = await sendReply({
      phoneNumberId: params.phoneNumberId,
      accessToken: connection.accessToken,
      to: params.message.from,
      replyText: customerReplyText,
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
          aiReplyText: customerReplyText,
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
          bodyText: customerReplyText,
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
      aiReplyText: customerReplyText,
    };
  } catch (error) {
    const fallbackMessage = buildFallbackMessage(settings);
    let fallbackSent = false;
    let fallbackSendError: unknown = null;

    logger.error("api.webhooks.whatsapp", "AI reply processing failed; sending fallback when possible.", {
      error,
      waMessageId: inboundMessage.waMessageId,
    });

    try {
      await maybeNotifyOwner({
        userId: connection.userId,
        ownerEmail: connection.user.email,
        connectionId: connection.id,
        customerPhone: params.message.from,
        event: "ai_failed",
        subject: "تعذر إرسال رد AI",
        html: `<p>وصلت رسالة للعميل لكن مسار الرد التلقائي احتاج مراجعة.</p><p><strong>العميل:</strong> ${escapeHtml(params.message.from)}</p><p><a href="${appEnv.NEXT_PUBLIC_APP_URL}/messages">راجع الرسالة</a></p>`,
        notificationPrefs: settings.notificationPrefs,
      });
    } catch (notificationError) {
      logger.warn("api.webhooks.whatsapp", "AI failure notification failed without blocking fallback.", {
        error: notificationError,
      });
    }

    try {
      const sendResponse = await sendReply({
        phoneNumberId: params.phoneNumberId,
        accessToken: connection.accessToken,
        to: params.message.from,
        replyText: fallbackMessage,
      });
      const outboundWaMessageId = sendResponse.messages[0]?.id;

      if (outboundWaMessageId) {
        fallbackSent = true;
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
      fallbackSendError = fallbackError;
      logger.error("api.webhooks.whatsapp", "Fallback WhatsApp send failed.", {
        error: fallbackError,
        waMessageId: inboundMessage.waMessageId,
      });
    }

    await prisma.message.update({
      where: { id: inboundMessage.id },
      data: {
        status: fallbackSent ? MessageStatus.REPLIED : MessageStatus.FAILED,
        aiReplyText: fallbackSent ? fallbackMessage : describeAutomaticReplyFailure(error, fallbackSendError),
        processedAt: new Date(),
      },
    });

    if (fallbackSent) {
      await incrementReplyCount(connection.userId);
    }

    return {
      waMessageId: inboundMessage.waMessageId,
      status: fallbackSent ? MessageStatus.REPLIED : MessageStatus.FAILED,
      aiReplyText: fallbackSent ? fallbackMessage : describeAutomaticReplyFailure(error, fallbackSendError),
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
