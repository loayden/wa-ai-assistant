import { MessageDirection, MessageStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { CSAT_THANK_YOU_MESSAGE, parseCsatRating } from "@/lib/assistant/csat";
import { isWithinWorkingHours } from "@/lib/assistant/working-hours";
import { buildFallbackMessage, getOrCreateUserSettings, updateUserSettings } from "@/lib/api/settings";
import { preprocessMessage } from "@/lib/ai/franco";
import { detectAngryTone } from "@/lib/ai/mood";
import { stripOrderTag } from "@/lib/ai/order-extraction";
import { detectTopicFromText, findRoutingRuleForTopic } from "@/lib/ai/topic-routing";
import { getOrUpsertCustomerProfile } from "@/lib/customers/profiles";
import { buildAIReplyTraceMetadata, generateAIReply } from "@/lib/openai/client";
import { prisma } from "@/lib/prisma/client";
import { buildOutboundAttemptMetadata, classifyOutboundFailure } from "@/lib/reliability/outbound";
import { sendEmail } from "@/lib/resend/client";
import { decrypt } from "@/lib/utils/encryption";
import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";
import { handleOwnerCommand } from "@/lib/utils/ownerCommands";
import { checkSubscriptionLimit, claimSubscriptionReply } from "@/lib/utils/subscription";
import type { InboundWhatsAppMessage } from "@/lib/validators/message";
import { transcribeWhatsAppAudio } from "@/lib/whatsapp/voice";

import { extractMessageBody, extractMediaType, extractAudioMediaId, normalizePhoneNumber, escapeHtml } from "./utils";
import { sendReply, sendTrackedWhatsAppReply, describeAutomaticReplyFailure, maybeNotifyOwner } from "./outbound";
import { detectAndSaveLead, createDetectedOrder } from "./extraction";

export type WebhookProcessingResult = {
  waMessageId: string;
  status: MessageStatus | "DUPLICATE" | "NO_CONNECTION";
  aiReplyText?: string;
};

export async function processInboundMessage(params: {
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
  let voiceTranscriptionFailed = false;
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
        const transcript = transcription.transcript?.trim();

        if (!transcript) {
          throw new Error("Voice transcription returned empty text.");
        }

        bodyText = transcript;
        aiInputText = transcript;
        mediaUrl = transcription.mediaUrl;
        messageMetadata.type = "voice_transcribed";
        messageMetadata.mime_type = transcription.mimeType;
      } catch (error) {
        logger.warn("api.webhooks.whatsapp", "Voice message transcription failed.", {
          error,
          waMessageId: params.message.id,
        });
        messageMetadata.type = "voice_transcription_failed";
        messageMetadata.transcriptionFailed = true;
        bodyText = "[رسالة صوتية]";
        aiInputText = bodyText;
        voiceTranscriptionFailed = true;
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

  await getOrUpsertCustomerProfile({
    userId: connection.userId,
    externalId: params.message.from,
    channel: "whatsapp",
  }).catch((error) => logger.warn("api.webhooks.whatsapp", "Customer profile upsert failed.", { error }));

  if (voiceTranscriptionFailed) {
    /*
     * Never feed an empty or placeholder string to the AI. Acknowledge the
     * voice note with a friendly fallback and stop the pipeline here.
     */
    const voiceFallbackMessage = "شكراً لرسالتك الصوتية! سنرد عليك قريباً. 🙏";

    try {
      const sendResult = await sendTrackedWhatsAppReply({
        connection,
        relatedMessageId: inboundMessage.id,
        displayPhoneNumber: params.displayPhoneNumber,
        to: params.message.from,
        replyText: voiceFallbackMessage,
      });

      if (!sendResult.success) {
        throw new Error(sendResult.failure.userMessage);
      }

      await prisma.message.update({
        where: { id: inboundMessage.id },
        data: {
          status: MessageStatus.REPLIED,
          aiReplyText: voiceFallbackMessage,
          aiModelUsed: "voice-fallback",
          processedAt: new Date(),
        },
      });

      return {
        waMessageId: inboundMessage.waMessageId,
        status: MessageStatus.REPLIED,
        aiReplyText: voiceFallbackMessage,
      };
    } catch (fallbackError) {
      logger.error("api.webhooks.whatsapp", "Voice fallback send failed.", {
        error: fallbackError,
        waMessageId: inboundMessage.waMessageId,
      });

      await prisma.message.update({
        where: { id: inboundMessage.id },
        data: {
          status: MessageStatus.FAILED,
          aiReplyText: voiceFallbackMessage,
          aiModelUsed: "voice-fallback",
          processedAt: new Date(),
        },
      });

      return {
        waMessageId: inboundMessage.waMessageId,
        status: MessageStatus.FAILED,
        aiReplyText: voiceFallbackMessage,
      };
    }
  }

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

    let outboundWaMessageId: string | null = null;
    let offHoursSendError: unknown = null;

    try {
      const sendResponse = await sendReply({
        phoneNumberId: params.phoneNumberId,
        accessToken: connection.accessToken,
        to: params.message.from,
        replyText: settings.offHoursMessage,
      });
      outboundWaMessageId = sendResponse.messages[0]?.id ?? null;
    } catch (error) {
      offHoursSendError = error;
      logger.error("api.webhooks.whatsapp", "Off-hours WhatsApp send failed; marking inbound as failed.", {
        error,
        waMessageId: inboundMessage.waMessageId,
      });
    }

    if (!outboundWaMessageId) {
      const failure = classifyOutboundFailure({
        channel: "whatsapp",
        error: offHoursSendError ?? new Error("WhatsApp API did not return an off-hours message id."),
      });

      await prisma.message.update({
        where: { id: inboundMessage.id },
        data: {
          status: MessageStatus.FAILED,
          aiReplyText: settings.offHoursMessage,
          aiModelUsed: "off-hours",
          metadata: {
            ...messageMetadata,
            outboundAttempt: buildOutboundAttemptMetadata({
              channel: "whatsapp",
              direction: "auto",
              stage: failure.retry.canRetry ? "failed" : "blocked",
              failure,
            }),
          },
          processedAt: new Date(),
        },
      });

      return {
        waMessageId: inboundMessage.waMessageId,
        status: MessageStatus.FAILED,
        aiReplyText: settings.offHoursMessage,
      };
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

  /*
   * Quota is only *checked* here. The reply credit is claimed after an AI
   * reply is actually sent successfully (see below), so handoffs, off-hours
   * messages, and failures never consume quota.
   */
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
      channel: "whatsapp",
      connectionId: connection.id,
      customerId: params.message.from,
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

    const sendResult = await sendTrackedWhatsAppReply({
      connection,
      relatedMessageId: inboundMessage.id,
      displayPhoneNumber: params.displayPhoneNumber,
      to: params.message.from,
      replyText: customerReplyText,
    });

    if (!sendResult.success) {
      throw new Error(sendResult.failure.userMessage);
    }

    const outboundWaMessageId = sendResult.externalMessageId;

    if (!outboundWaMessageId) {
      throw new Error("WhatsApp API did not return an outbound message id.");
    }

    /*
     * The AI reply was sent successfully — only now do we consume one quota
     * credit. If the claim itself fails (e.g. a concurrent race on FREE),
     * the reply is already delivered, so we log and continue.
     */
    try {
      const claim = await claimSubscriptionReply(connection.userId);

      if (!claim.claimed) {
        logger.warn("api.webhooks.whatsapp", "AI reply sent but the quota claim was not recorded.", {
          waMessageId: inboundMessage.waMessageId,
        });
      }
    } catch (claimError) {
      logger.warn("api.webhooks.whatsapp", "Quota claim after a successful AI reply failed.", {
        error: claimError,
        waMessageId: inboundMessage.waMessageId,
      });
    }

    await prisma.$transaction([
      prisma.message.update({
        where: { id: inboundMessage.id },
        data: {
          status: MessageStatus.REPLIED,
          aiReplyText: customerReplyText,
          aiModelUsed: aiReply.modelUsed,
          aiTokensUsed: aiReply.tokensUsed,
          metadata: {
            ...messageMetadata,
            aiReplyTrace: buildAIReplyTraceMetadata(aiReply),
            outboxId: sendResult.outbox.id,
            outboundAttempt: buildOutboundAttemptMetadata({
              channel: "whatsapp",
              direction: "auto",
              stage: "sent",
              providerMessageId: outboundWaMessageId,
            }),
          },
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
          metadata: {
            outboxId: sendResult.outbox.id,
            outboundAttempt: buildOutboundAttemptMetadata({
              channel: "whatsapp",
              direction: "auto",
              stage: "sent",
              providerMessageId: outboundWaMessageId,
            }),
          },
          processedAt: new Date(),
        },
      }),
    ]);

    return {
      waMessageId: inboundMessage.waMessageId,
      status: MessageStatus.REPLIED,
      aiReplyText: customerReplyText,
    };
  } catch (error) {
    const fallbackMessage = buildFallbackMessage(settings);
    let fallbackSent = false;
    let fallbackSendError: unknown = null;
    let fallbackFailure: ReturnType<typeof classifyOutboundFailure> | null = null;
    let fallbackOutboxId: string | null = null;

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
      const sendResult = await sendTrackedWhatsAppReply({
        connection,
        relatedMessageId: inboundMessage.id,
        displayPhoneNumber: params.displayPhoneNumber,
        to: params.message.from,
        replyText: fallbackMessage,
      });
      const outboundWaMessageId = sendResult.success ? sendResult.externalMessageId : null;
      fallbackOutboxId = sendResult.outbox.id;

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
            metadata: {
              outboxId: sendResult.outbox.id,
              outboundAttempt: buildOutboundAttemptMetadata({
                channel: "whatsapp",
                direction: "auto",
                stage: "sent",
                providerMessageId: outboundWaMessageId,
              }),
            },
            processedAt: new Date(),
          },
        });
      } else if (!sendResult.success) {
        fallbackFailure = sendResult.failure;
        fallbackSendError = sendResult.failure;
      }
    } catch (fallbackError) {
      fallbackSendError = fallbackError;
      logger.error("api.webhooks.whatsapp", "Fallback WhatsApp send failed.", {
        error: fallbackError,
        waMessageId: inboundMessage.waMessageId,
      });
    }
    const finalFailure = fallbackSent ? null : fallbackFailure ?? classifyOutboundFailure({ channel: "whatsapp", error: fallbackSendError ?? error });

    await prisma.message.update({
      where: { id: inboundMessage.id },
      data: {
        status: fallbackSent ? MessageStatus.REPLIED : MessageStatus.FAILED,
        aiReplyText: fallbackSent ? fallbackMessage : describeAutomaticReplyFailure(error, fallbackSendError),
        metadata: {
          ...messageMetadata,
          ...(fallbackOutboxId ? { outboxId: fallbackOutboxId } : {}),
          outboundAttempt: fallbackSent
            ? buildOutboundAttemptMetadata({
                channel: "whatsapp",
                direction: "auto",
                stage: "sent",
              })
            : buildOutboundAttemptMetadata({
                channel: "whatsapp",
                direction: "auto",
                stage: finalFailure?.retry.canRetry ? "failed" : "blocked",
                failure: finalFailure ?? undefined,
              }),
        },
        processedAt: new Date(),
      },
    });

    return {
      waMessageId: inboundMessage.waMessageId,
      status: fallbackSent ? MessageStatus.REPLIED : MessageStatus.FAILED,
      aiReplyText: fallbackSent ? fallbackMessage : describeAutomaticReplyFailure(error, fallbackSendError),
    };
  }
}
