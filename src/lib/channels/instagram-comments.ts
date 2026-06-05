import { MessageDirection, MessageStatus } from "@prisma/client";

import { getOrCreateUserSettings } from "@/lib/api/settings";
import { instagramAdapter } from "@/lib/channels/adapters/instagram";
import { INSTAGRAM_COMMENT_PERMISSION_REQUIREMENTS, hasPermissionRequirements } from "@/lib/meta/permissions";
import { prisma } from "@/lib/prisma/client";
import { decrypt } from "@/lib/utils/encryption";
import { logger } from "@/lib/utils/logger";

const BUYING_INTENT_PATTERNS = [
  /\b(how much|price|cost|available|in stock|want|buy|order|ship|shipping)\b/i,
  /\b(بكام|كام|السعر|سعره|متوفر|متاحة|موجود|عايز|عايزة|اشتري|اطلب|توصيل|شحن)\b/i,
];

type InstagramCommentData = {
  id?: string;
  text?: string;
  from?: {
    id?: string;
    username?: string;
    name?: string;
  };
  media?: {
    id?: string;
    caption?: string;
    media_url?: string;
    timestamp?: string;
  };
};

export function detectInstagramCommentBuyingIntent(text: string): boolean {
  const value = text.trim();
  return value.length > 0 && BUYING_INTENT_PATTERNS.some((pattern) => pattern.test(value));
}

function hasCommentPermissions(connection: { permissions: string[]; permissionStatus: string }) {
  return connection.permissionStatus === "granted" && hasPermissionRequirements(connection.permissions, INSTAGRAM_COMMENT_PERMISSION_REQUIREMENTS);
}

function commentMessageId(commentId: string) {
  return `instagram-comment:${commentId}`;
}

function dmMessageId(externalMessageId: string | undefined) {
  return externalMessageId ? `instagram-comment-dm:${externalMessageId}` : `instagram-comment-dm:${crypto.randomUUID()}`;
}

export async function processInstagramComment(commentData: InstagramCommentData, instagramAccountId: string) {
  const commentId = commentData.id;
  const commentText = commentData.text?.trim();
  const commenterId = commentData.from?.id;

  if (!commentId || !commentText || !commenterId) {
    logger.warn("meta.instagram.comment", "Ignored malformed Instagram comment webhook event.");
    return;
  }

  const existing = await prisma.instagramCommentLead.findUnique({
    where: { commentId },
    select: { id: true },
  });

  if (existing) {
    return;
  }

  const connection = await prisma.whatsAppConnection.findFirst({
    where: {
      channel: "instagram",
      instagramAccountId,
      isActive: true,
      isVerified: true,
    },
  });

  if (!connection) {
    return;
  }

  const settings = await getOrCreateUserSettings(connection.userId);

  if (!settings.commentToDmEnabled) {
    return;
  }

  if (!hasCommentPermissions(connection)) {
    logger.warn("meta.instagram.comment", "Comment-to-DM permissions are missing.", {
      connectionId: connection.id,
      permissionStatus: connection.permissionStatus,
      permissions: connection.permissions,
    });
    return;
  }

  const postId = commentData.media?.id ?? null;
  const isLead = detectInstagramCommentBuyingIntent(commentText);
  const commenterName = commentData.from?.username ?? commentData.from?.name ?? null;
  const postCaption = commentData.media?.caption ?? null;
  const postTimestamp = commentData.media?.timestamp ? new Date(commentData.media.timestamp) : null;

  const commentRecord = await prisma.instagramCommentLead.create({
    data: {
      userId: connection.userId,
      connectionId: connection.id,
      commentId,
      commentText,
      commenterId,
      commenterName,
      postId,
      postCaption,
      isLead,
    },
  });

  await prisma.message.create({
    data: {
      userId: connection.userId,
      connectionId: connection.id,
      waMessageId: commentMessageId(commentId),
      direction: MessageDirection.INBOUND,
      fromNumber: commenterId,
      toNumber: instagramAccountId,
      bodyText: commentText,
      channel: "instagram",
      externalMessageId: commentId,
      externalThreadId: commenterId,
      senderName: commenterName,
      status: isLead ? MessageStatus.PROCESSING : MessageStatus.RECEIVED,
      metadata: {
        type: "instagram_comment",
        postId,
        postCaption,
        isLead,
      },
    },
  });

  if (postId) {
    await prisma.instagramPostStats.upsert({
      where: { userId_postId: { userId: connection.userId, postId } },
      create: {
        userId: connection.userId,
        connectionId: connection.id,
        postId,
        postCaption,
        postMediaUrl: commentData.media?.media_url ?? null,
        postTimestamp: postTimestamp && Number.isNaN(postTimestamp.getTime()) ? null : postTimestamp,
        commentCount: 1,
        leadCount: isLead ? 1 : 0,
        dmCount: isLead ? 1 : 0,
      },
      update: {
        commentCount: { increment: 1 },
        leadCount: { increment: isLead ? 1 : 0 },
        dmCount: { increment: isLead ? 1 : 0 },
        lastUpdatedAt: new Date(),
        ...(postCaption ? { postCaption } : {}),
      },
    });
  }

  if (!isLead) {
    return;
  }

  const accessToken = decrypt(connection.pageAccessTokenEncrypted ?? connection.accessToken);
  const dmText = settings.commentToDmMessage || "مرحباً! 👋 شكراً لاهتمامك. كيف يمكنني مساعدتك؟";
  const dmResult = await instagramAdapter.sendText({
    connectionId: connection.id,
    recipientId: commenterId,
    text: dmText,
    accessToken,
    phoneNumberId: instagramAccountId,
  });

  const lead = await prisma.lead.create({
    data: {
      userId: connection.userId,
      connectionId: connection.id,
      customerPhone: commenterId,
      customerName: commenterName,
      channel: "instagram",
      externalId: commenterId,
      senderName: commenterName,
      interest: `تعليق على منشور: "${commentText.slice(0, 80)}"`,
      status: "new",
      source: "instagram_comment",
    },
  });

  await prisma.instagramCommentLead.update({
    where: { id: commentRecord.id },
    data: {
      dmSent: dmResult.success,
      dmMessageId: dmResult.externalMessageId ?? null,
      leadId: lead.id,
    },
  });

  if (dmResult.success) {
    await prisma.message.create({
      data: {
        userId: connection.userId,
        connectionId: connection.id,
        waMessageId: dmMessageId(dmResult.externalMessageId),
        direction: MessageDirection.OUTBOUND,
        fromNumber: instagramAccountId,
        toNumber: commenterId,
        bodyText: dmText,
        channel: "instagram",
        externalMessageId: dmResult.externalMessageId,
        externalThreadId: commenterId,
        status: MessageStatus.REPLIED,
        aiReplyText: dmText,
        aiModelUsed: "comment-to-dm",
        processedAt: new Date(),
        metadata: {
          type: "instagram_comment_dm",
          commentId,
          postId,
        },
      },
    });
  }
}
