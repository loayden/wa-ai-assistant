import { MessageDirection, MessageStatus, type Prisma } from "@prisma/client";

import { buildFallbackMessage, getOrCreateUserSettings } from "@/lib/api/settings";
import { isWithinWorkingHours } from "@/lib/assistant/working-hours";
import { detectLeadIntent } from "@/lib/ai/leads";
import { detectAngryTone } from "@/lib/ai/mood";
import { detectSocialIntent, type SocialIntent } from "@/lib/ai/social-intent";
import { detectTopicFromText, findRoutingRuleForTopic } from "@/lib/ai/topic-routing";
import { getAdapter } from "@/lib/channels";
import { instagramAdapter } from "@/lib/channels/adapters/instagram";
import { messengerAdapter } from "@/lib/channels/adapters/messenger";
import { processInstagramComment } from "@/lib/channels/instagram-comments";
import type { MessagingChannel, NormalizedInboundMessage } from "@/lib/channels/types";
import { getOrUpsertCustomerProfile } from "@/lib/customers/profiles";
import { AIReplyError, generateAIReply } from "@/lib/openai/client";
import { prisma } from "@/lib/prisma/client";
import { sendEmail } from "@/lib/resend/client";
import { decrypt } from "@/lib/utils/encryption";
import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";
import { checkSubscriptionLimit, incrementReplyCount } from "@/lib/utils/subscription";

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

function socialWaMessageId(channel: MessagingChannel, externalMessageId: string) {
  return `${channel}:${externalMessageId}`;
}

function outboundSocialMessageId(channel: MessagingChannel, externalMessageId: string | undefined) {
  return externalMessageId ? `${channel}:${externalMessageId}` : `${channel}:out:${crypto.randomUUID()}`;
}

function getConnectionLookup(msg: NormalizedInboundMessage) {
  if (msg.channel === "messenger" && msg.pageId) {
    return {
      channel: "messenger",
      facebookPageId: msg.pageId,
      isActive: true,
      isVerified: true,
    };
  }

  if (msg.channel === "instagram" && msg.instagramAccountId) {
    return {
      channel: "instagram",
      instagramAccountId: msg.instagramAccountId,
      isActive: true,
      isVerified: true,
    };
  }

  return null;
}

async function findConnectionForMessage(msg: NormalizedInboundMessage) {
  const lookup = getConnectionLookup(msg);

  if (!lookup) {
    return null;
  }

  return prisma.whatsAppConnection.findFirst({
    where: lookup,
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });
}

async function saveInboundMessageOnly(msg: NormalizedInboundMessage) {
  const connection = await findConnectionForMessage(msg);

  if (!connection) {
    return null;
  }

  const existing = await prisma.message.findFirst({
    where: {
      OR: [{ waMessageId: socialWaMessageId(msg.channel, msg.externalMessageId) }, { externalMessageId: msg.externalMessageId }],
    },
    select: { id: true },
  });

  if (existing) {
    return existing;
  }

  return prisma.message.create({
    data: {
      userId: connection.userId,
      connectionId: connection.id,
      waMessageId: socialWaMessageId(msg.channel, msg.externalMessageId),
      direction: MessageDirection.INBOUND,
      fromNumber: msg.externalThreadId,
      toNumber: msg.pageId ?? msg.instagramAccountId ?? connection.phoneNumberId,
      bodyText: msg.text ?? `[${msg.messageType} message]`,
      mediaType: msg.messageType === "text" ? null : msg.messageType,
      channel: msg.channel,
      externalMessageId: msg.externalMessageId,
      externalThreadId: msg.externalThreadId,
      senderName: msg.senderName ?? null,
      senderProfilePicUrl: msg.senderProfilePicUrl ?? null,
      metadata: {
        type: msg.messageType,
        channel: msg.channel,
        raw: msg.rawPayload as Prisma.InputJsonValue,
      },
      status: MessageStatus.RECEIVED,
    },
  });
}

async function notifyOwner(params: {
  ownerEmail: string | null | undefined;
  subject: string;
  html: string;
}) {
  if (!params.ownerEmail) {
    return;
  }

  await sendEmail({
    to: params.ownerEmail,
    subject: params.subject,
    html: params.html,
  });
}

function describeSocialAiFailure(error: unknown): string {
  if (error instanceof AIReplyError) {
    if (error.code === "OPENAI_RATE_LIMIT") {
      return "لم يتم إرسال الرد لأن المساعد غير متاح مؤقتاً.";
    }

    if (error.code === "OPENAI_TIMEOUT") {
      return "لم يتم إرسال الرد لأن المساعد تأخر في الاستجابة.";
    }
  }

  return "وصلت الرسالة لكن الرد التلقائي على قناة Meta لم يكتمل. راجع صلاحيات القناة أو تواصل مع الدعم.";
}

async function sendSocialFallbackReply(params: {
  connection: NonNullable<Awaited<ReturnType<typeof findConnectionForMessage>>>;
  inboundMessageId: string;
  msg: NormalizedInboundMessage;
  settings: Awaited<ReturnType<typeof getOrCreateUserSettings>>;
  accessToken: string;
  reason: unknown;
}) {
  const fallbackText = buildFallbackMessage(params.settings);
  const adapter = getAdapter(params.msg.channel);
  const sendResult = await adapter.sendText({
    connectionId: params.connection.id,
    recipientId: params.msg.externalThreadId,
    text: fallbackText,
    accessToken: params.accessToken,
    pageId: params.msg.pageId,
  });

  if (!sendResult.success) {
    await prisma.message.update({
      where: { id: params.inboundMessageId },
      data: {
        status: MessageStatus.FAILED,
        aiReplyText: describeSocialAiFailure(params.reason),
        processedAt: new Date(),
      },
    });
    return;
  }

  await prisma.$transaction([
    prisma.message.update({
      where: { id: params.inboundMessageId },
      data: {
        status: MessageStatus.REPLIED,
        aiReplyText: fallbackText,
        aiModelUsed: "fallback-ai-unavailable",
        processedAt: new Date(),
      },
    }),
    prisma.message.create({
      data: {
        userId: params.connection.userId,
        connectionId: params.connection.id,
        waMessageId: outboundSocialMessageId(params.msg.channel, sendResult.externalMessageId),
        direction: MessageDirection.OUTBOUND,
        fromNumber: params.msg.pageId ?? params.msg.instagramAccountId ?? params.connection.phoneNumberId,
        toNumber: params.msg.externalThreadId,
        bodyText: fallbackText,
        status: MessageStatus.REPLIED,
        aiModelUsed: "fallback-ai-unavailable",
        channel: params.msg.channel,
        externalMessageId: sendResult.externalMessageId,
        externalThreadId: params.msg.externalThreadId,
        processedAt: new Date(),
      },
    }),
  ]);

  await incrementReplyCount(params.connection.userId);
}

function intentTag(intent: SocialIntent) {
  if (intent === "spam") return "spam";
  if (intent === "complaint") return "complaint";
  if (intent === "collaboration") return "collaboration";
  if (intent === "influencer_request") return "influencer";
  if (intent === "order") return "order";
  return null;
}

async function upsertThreadState(params: {
  userId: string;
  connectionId: string;
  customerPhone: string;
  active?: boolean;
  priority?: string;
  socialIntent?: SocialIntent;
  tag?: string | null;
}) {
  const existing = await prisma.conversationHandoff.findUnique({
    where: {
      userId_connectionId_customerPhone: {
        userId: params.userId,
        connectionId: params.connectionId,
        customerPhone: params.customerPhone,
      },
    },
    select: { tags: true },
  });
  const tags = params.tag ? Array.from(new Set([...(existing?.tags ?? []), params.tag])) : existing?.tags ?? [];

  return prisma.conversationHandoff.upsert({
    where: {
      userId_connectionId_customerPhone: {
        userId: params.userId,
        connectionId: params.connectionId,
        customerPhone: params.customerPhone,
      },
    },
    update: {
      ...(params.active !== undefined ? { active: params.active, handoffAt: params.active ? new Date() : undefined } : {}),
      ...(params.priority ? { priority: params.priority } : {}),
      ...(params.socialIntent ? { socialIntent: params.socialIntent } : {}),
      tags,
    },
    create: {
      userId: params.userId,
      connectionId: params.connectionId,
      customerPhone: params.customerPhone,
      active: params.active ?? false,
      handoffAt: params.active ? new Date() : null,
      priority: params.priority ?? "normal",
      socialIntent: params.socialIntent,
      tags,
    },
  });
}

export async function processSocialMessage(msg: NormalizedInboundMessage) {
  const connection = await findConnectionForMessage(msg);

  if (!connection) {
    logger.warn("meta.social", "No connected social channel matched inbound message.", {
      channel: msg.channel,
      pageId: msg.pageId,
      instagramAccountId: msg.instagramAccountId,
    });
    return;
  }

  const existing = await prisma.message.findFirst({
    where: {
      OR: [{ waMessageId: socialWaMessageId(msg.channel, msg.externalMessageId) }, { externalMessageId: msg.externalMessageId }],
    },
    select: { id: true },
  });

  if (existing) {
    return;
  }

  if (msg.messageType === "unknown" || !msg.text?.trim()) {
    await saveInboundMessageOnly(msg);
    return;
  }

  const settings = await getOrCreateUserSettings(connection.userId);
  const inboundMessage = await prisma.message.create({
    data: {
      userId: connection.userId,
      connectionId: connection.id,
      waMessageId: socialWaMessageId(msg.channel, msg.externalMessageId),
      direction: MessageDirection.INBOUND,
      fromNumber: msg.externalThreadId,
      toNumber: msg.pageId ?? msg.instagramAccountId ?? connection.phoneNumberId,
      bodyText: msg.text,
      status: settings.autoReplyEnabled ? MessageStatus.PROCESSING : MessageStatus.IGNORED,
      channel: msg.channel,
      externalMessageId: msg.externalMessageId,
      externalThreadId: msg.externalThreadId,
      senderName: msg.senderName ?? null,
      senderProfilePicUrl: msg.senderProfilePicUrl ?? null,
      metadata: {
        type: msg.messageType,
        channel: msg.channel,
        raw: msg.rawPayload as Prisma.InputJsonValue,
      },
    },
  });

  await getOrUpsertCustomerProfile({
    userId: connection.userId,
    externalId: msg.externalThreadId,
    channel: msg.channel,
    name: msg.senderName ?? null,
    instagramUsername: msg.channel === "instagram" ? msg.senderName ?? null : null,
  }).catch((error) => logger.warn("meta.social", "Customer profile upsert failed.", { error }));

  const handoff = await prisma.conversationHandoff.findUnique({
    where: {
      userId_connectionId_customerPhone: {
        userId: connection.userId,
        connectionId: connection.id,
        customerPhone: msg.externalThreadId,
      },
    },
    select: { active: true },
  });

  if (!settings.autoReplyEnabled || handoff?.active) {
    await prisma.message.update({
      where: { id: inboundMessage.id },
      data: {
        status: handoff?.active ? MessageStatus.RECEIVED : MessageStatus.IGNORED,
        processedAt: new Date(),
      },
    });
    return;
  }

  const accessToken = decrypt(connection.pageAccessTokenEncrypted ?? connection.accessToken);
  const adapter = getAdapter(msg.channel);

  const socialIntent = await detectSocialIntent(msg.text);
  const tag = intentTag(socialIntent);

  await prisma.message.update({
    where: { id: inboundMessage.id },
    data: {
      metadata: {
        ...(inboundMessage.metadata as Record<string, unknown>),
        socialIntent,
      },
    },
  });

  if (tag) {
    await upsertThreadState({
      userId: connection.userId,
      connectionId: connection.id,
      customerPhone: msg.externalThreadId,
      priority: socialIntent === "spam" ? "low" : socialIntent === "complaint" ? "high" : "normal",
      socialIntent,
      tag,
    });
  }

  if (socialIntent === "spam") {
    await prisma.message.update({
      where: { id: inboundMessage.id },
      data: {
        status: MessageStatus.IGNORED,
        processedAt: new Date(),
      },
    });
    return;
  }

  if (socialIntent === "complaint") {
    const handoffReply = "شكراً لتواصلك. سيتواصل معك أحد فريقنا قريباً لحل المشكلة. 🙏";
    const sendResult = await adapter.sendText({
      connectionId: connection.id,
      recipientId: msg.externalThreadId,
      text: handoffReply,
      accessToken,
      pageId: msg.pageId,
    });

    await upsertThreadState({
      userId: connection.userId,
      connectionId: connection.id,
      customerPhone: msg.externalThreadId,
      active: true,
      priority: "high",
      socialIntent,
      tag: "complaint",
    });

    await prisma.message.update({
      where: { id: inboundMessage.id },
      data: {
        status: sendResult.success ? MessageStatus.REPLIED : MessageStatus.FAILED,
        aiReplyText: handoffReply,
        aiModelUsed: "social-intent-handoff",
        processedAt: new Date(),
      },
    });
    return;
  }

  if (socialIntent === "collaboration" || socialIntent === "influencer_request") {
    await notifyOwner({
      ownerEmail: connection.user.email,
      subject: "طلب تعاون/إعلان جديد",
      html: `<p>وصل طلب تعاون من ${escapeHtml(msg.senderName ?? msg.externalThreadId)}</p><p><strong>القناة:</strong> ${escapeHtml(msg.channel)}</p><p><strong>الرسالة:</strong> ${escapeHtml(msg.text)}</p><p><a href="${appEnv.NEXT_PUBLIC_APP_URL}/messages">فتح المحادثة</a></p>`,
    }).catch((error) => logger.warn("meta.social", "Collaboration notification failed.", { error }));
  }

  if (!isWithinWorkingHours(settings)) {
    const sendResult = await adapter.sendText({
      connectionId: connection.id,
      recipientId: msg.externalThreadId,
      text: settings.offHoursMessage,
      accessToken,
      pageId: msg.pageId,
    });

    await prisma.$transaction([
      prisma.message.update({
        where: { id: inboundMessage.id },
        data: {
          status: sendResult.success ? MessageStatus.REPLIED : MessageStatus.FAILED,
          aiReplyText: settings.offHoursMessage,
          aiModelUsed: "off-hours",
          processedAt: new Date(),
        },
      }),
      ...(sendResult.success
        ? [
            prisma.message.create({
              data: {
                userId: connection.userId,
                connectionId: connection.id,
                waMessageId: outboundSocialMessageId(msg.channel, sendResult.externalMessageId),
                direction: MessageDirection.OUTBOUND,
                fromNumber: msg.pageId ?? msg.instagramAccountId ?? connection.phoneNumberId,
                toNumber: msg.externalThreadId,
                bodyText: settings.offHoursMessage,
                status: MessageStatus.REPLIED,
                aiModelUsed: "off-hours",
                channel: msg.channel,
                externalMessageId: sendResult.externalMessageId,
                externalThreadId: msg.externalThreadId,
                processedAt: new Date(),
              },
            }),
          ]
        : []),
    ]);
    return;
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
    return;
  }

  try {
    const routingRules = await prisma.routingRule.findMany({
      where: { userId: connection.userId, isActive: true },
      select: {
        topic: true,
        keywords: true,
        action: true,
        targetEmail: true,
        targetPhone: true,
        customAiInstruction: true,
        isActive: true,
      },
    });
    const detectedTopic = detectTopicFromText(msg.text);
    const routingRule = findRoutingRuleForTopic({ message: msg.text, rules: routingRules, topic: detectedTopic });
    const extraInstructions: string[] = [];
    if (socialIntent === "collaboration" || socialIntent === "influencer_request") {
      extraInstructions.push("Acknowledge the collaboration request politely. Do not promise acceptance; tell them the owner will review it.");
    }

    if (detectAngryTone(msg.text)) {
      await notifyOwner({
        ownerEmail: connection.user.email,
        subject: "عميل يحتاج اهتمامك",
        html: `<p>وصلت رسالة من ${msg.channel} قد تحتاج تدخل صاحب النشاط.</p><p><strong>الرسالة:</strong> ${escapeHtml(msg.text)}</p><p><a href="${appEnv.NEXT_PUBLIC_APP_URL}/messages">افتح صندوق الرسائل</a></p>`,
      }).catch((error) => logger.warn("meta.social", "Angry-customer notification failed.", { error }));
    }

    if (routingRule?.action === "handoff") {
      const handoffReply = "سيتواصل معك أحد المختصين قريباً.";
      const sendResult = await adapter.sendText({
        connectionId: connection.id,
        recipientId: msg.externalThreadId,
        text: handoffReply,
        accessToken,
        pageId: msg.pageId,
      });

      await prisma.conversationHandoff.upsert({
        where: {
          userId_connectionId_customerPhone: {
            userId: connection.userId,
            connectionId: connection.id,
            customerPhone: msg.externalThreadId,
          },
        },
        update: { active: true, handoffAt: new Date(), resumedAt: null },
        create: {
          userId: connection.userId,
          connectionId: connection.id,
          customerPhone: msg.externalThreadId,
          active: true,
          handoffAt: new Date(),
        },
      });

      await prisma.message.update({
        where: { id: inboundMessage.id },
        data: {
          status: sendResult.success ? MessageStatus.REPLIED : MessageStatus.FAILED,
          aiReplyText: handoffReply,
          aiModelUsed: "topic-routing-handoff",
          processedAt: new Date(),
        },
      });
      return;
    }

    if (routingRule?.action === "notify_email" && routingRule.targetEmail) {
      await sendEmail({
        to: routingRule.targetEmail,
        subject: `رسالة جديدة — ${detectedTopic}`,
        html: `<p>وصلت رسالة من ${msg.channel} تحتاج متابعة.</p><p><strong>العميل:</strong> ${escapeHtml(msg.senderName ?? msg.externalThreadId)}</p><p><strong>الرسالة:</strong> ${escapeHtml(msg.text)}</p>`,
      }).catch((error) => logger.warn("meta.social", "Routing email notification failed.", { error }));
    }

    if (routingRule?.action === "ai_reply" && routingRule.customAiInstruction?.trim()) {
      extraInstructions.push(routingRule.customAiInstruction.trim());
    }

    const aiReply = await generateAIReply({
      systemPrompt: settings.systemPrompt,
      userMessage: msg.text,
      settings,
      extraInstructions,
      channel: msg.channel,
    });
    const replyText = aiReply.replyText || buildFallbackMessage(settings);
    const leadResult = detectLeadIntent(msg.text);

    if (leadResult.isLead && leadResult.interest) {
      const existingLead = await prisma.lead.findFirst({
        where: {
          userId: connection.userId,
          connectionId: connection.id,
          externalId: msg.externalThreadId,
        },
        select: { id: true },
      });

      if (!existingLead) {
        await prisma.lead.create({
          data: {
            userId: connection.userId,
            connectionId: connection.id,
            messageId: inboundMessage.id,
            customerPhone: msg.externalThreadId,
            customerName: msg.senderName ?? null,
            interest: leadResult.interest,
            channel: msg.channel,
            externalId: msg.externalThreadId,
            senderName: msg.senderName ?? null,
          },
        });
      }
    }

    const sendResult = await adapter.sendText({
      connectionId: connection.id,
      recipientId: msg.externalThreadId,
      text: replyText,
      accessToken,
      pageId: msg.pageId,
    });

    if (!sendResult.success) {
      throw new Error(sendResult.error ?? "Meta send failed");
    }

    await prisma.$transaction([
      prisma.message.update({
        where: { id: inboundMessage.id },
        data: {
          status: MessageStatus.REPLIED,
          aiReplyText: replyText,
          aiModelUsed: aiReply.modelUsed,
          aiTokensUsed: aiReply.tokensUsed,
          processedAt: new Date(),
        },
      }),
      prisma.message.create({
        data: {
          userId: connection.userId,
          connectionId: connection.id,
          waMessageId: outboundSocialMessageId(msg.channel, sendResult.externalMessageId),
          direction: MessageDirection.OUTBOUND,
          fromNumber: msg.pageId ?? msg.instagramAccountId ?? connection.phoneNumberId,
          toNumber: msg.externalThreadId,
          bodyText: replyText,
          status: MessageStatus.REPLIED,
          aiModelUsed: aiReply.modelUsed,
          aiTokensUsed: aiReply.tokensUsed,
          channel: msg.channel,
          externalMessageId: sendResult.externalMessageId,
          externalThreadId: msg.externalThreadId,
          processedAt: new Date(),
        },
      }),
    ]);

    await incrementReplyCount(connection.userId);
  } catch (error) {
    logger.error("meta.social", "Social AI reply processing failed.", { error });

    if (error instanceof AIReplyError) {
      await sendSocialFallbackReply({
        connection,
        inboundMessageId: inboundMessage.id,
        msg,
        settings,
        accessToken,
        reason: error,
      });
      return;
    }

    await prisma.message.update({
      where: { id: inboundMessage.id },
      data: {
        status: MessageStatus.FAILED,
        aiReplyText: describeSocialAiFailure(error),
        processedAt: new Date(),
      },
    });
  }
}

export async function processSocialWebhook(body: { object?: string; entry?: unknown[] }) {
  const object = body.object;

  for (const entry of body.entry ?? []) {
    if (object === "instagram") {
      const entryData = entry as { id?: string; changes?: Array<{ field?: string; value?: unknown }> };
      for (const change of entryData.changes ?? []) {
        if (change.field === "comments" && entryData.id) {
          await processInstagramComment(change.value as Parameters<typeof processInstagramComment>[0], entryData.id).catch((error) =>
            logger.error("meta.social", "Instagram comment processing failed.", { error }),
          );
        }
      }
    }

    const normalized =
      object === "page"
        ? messengerAdapter.normalizeWebhookEvent(entry)
        : object === "instagram"
          ? instagramAdapter.normalizeWebhookEvent(entry)
          : [];

    for (const msg of normalized) {
      await processSocialMessage(msg);
    }
  }
}
