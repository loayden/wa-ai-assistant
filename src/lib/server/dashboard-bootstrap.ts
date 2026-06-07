import "server-only";

import type { MessageResponse, SettingsResponse } from "@/types/api";
import { ensureAppUser } from "@/lib/api/auth";
import { getOrCreateUserSettings } from "@/lib/api/settings";
import { sanitizeConnection } from "@/lib/api/whatsapp";
import { normalizeNotificationPrefs } from "@/lib/notifications/preferences";
import { prisma } from "@/lib/prisma/client";
import { getUser } from "@/lib/supabase/server";

function normalizeMessageMetadata(metadata: unknown): MessageResponse["metadata"] {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }

  return {};
}

function serializeMessage(message: {
  id: string;
  userId: string;
  connectionId: string;
  waMessageId: string;
  direction: MessageResponse["direction"];
  fromNumber: string;
  toNumber: string;
  bodyText: string;
  mediaUrl: string | null;
  mediaType: string | null;
  channel: string;
  externalMessageId: string | null;
  externalThreadId: string | null;
  senderName: string | null;
  senderProfilePicUrl: string | null;
  metadata: unknown;
  status: MessageResponse["status"];
  aiReplyText: string | null;
  aiModelUsed: string | null;
  aiTokensUsed: number | null;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  connection: {
    id: string;
      displayName: string | null;
      phoneNumberId: string;
      channel?: string;
      facebookPageName?: string | null;
      instagramUsername?: string | null;
  } | null;
  handoffActive?: boolean;
  handoffAt?: Date | string | null;
  resolvedAt?: Date | string | null;
  rating?: number | null;
  ratingRequestedAt?: Date | string | null;
}): MessageResponse {
  return {
    ...message,
    channel: message.channel === "instagram" || message.channel === "messenger" ? message.channel : "whatsapp",
    metadata: normalizeMessageMetadata(message.metadata),
    processedAt: message.processedAt?.toISOString() ?? null,
    createdAt: message.createdAt.toISOString(),
    updatedAt: message.updatedAt.toISOString(),
    handoffActive: message.handoffActive,
    handoffAt:
      message.handoffAt instanceof Date
        ? message.handoffAt.toISOString()
        : message.handoffAt ?? null,
    resolvedAt:
      message.resolvedAt instanceof Date
        ? message.resolvedAt.toISOString()
        : message.resolvedAt ?? null,
    rating: message.rating ?? null,
    ratingRequestedAt:
      message.ratingRequestedAt instanceof Date
        ? message.ratingRequestedAt.toISOString()
        : message.ratingRequestedAt ?? null,
    connection: message.connection ?? undefined,
  };
}

const dashboardMessageSelect = {
  id: true,
  userId: true,
  connectionId: true,
  waMessageId: true,
  direction: true,
  fromNumber: true,
  toNumber: true,
  bodyText: true,
  mediaUrl: true,
  mediaType: true,
  channel: true,
  externalMessageId: true,
  externalThreadId: true,
  senderName: true,
  senderProfilePicUrl: true,
  metadata: true,
  status: true,
  aiReplyText: true,
  aiModelUsed: true,
  aiTokensUsed: true,
  processedAt: true,
  createdAt: true,
  updatedAt: true,
  connection: {
    select: {
      id: true,
      displayName: true,
      phoneNumberId: true,
      channel: true,
      facebookPageName: true,
      instagramUsername: true,
    },
  },
} as const;

function serializeSettingsUser(user: Awaited<ReturnType<typeof ensureAppUser>>): SettingsResponse["user"] {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    isAdmin: user.isAdmin,
    planTier: user.planTier,
    subscriptionStatus: user.subscriptionStatus,
    monthlyReplyCount: user.monthlyReplyCount,
    onboardingCompleted: user.onboardingCompleted,
    trialEndsAt: user.trialEndsAt?.toISOString() ?? null,
    trialUsed: user.trialUsed,
    paidAt: user.paidAt?.toISOString() ?? null,
    usageAlert80SentAt: user.usageAlert80SentAt?.toISOString() ?? null,
    usageAlert100SentAt: user.usageAlert100SentAt?.toISOString() ?? null,
    replyCountResetAt: user.replyCountResetAt.toISOString(),
    paymentCustomerId: user.paymentCustomerId,
    paymentSubscriptionId: user.paymentSubscriptionId,
  };
}

export async function getShellUser() {
  const supabaseUser = await getUser();

  if (!supabaseUser) {
    return null;
  }

  const appUser = await ensureAppUser(supabaseUser);

  return {
    appUser,
    supabaseUser,
  };
}

export async function getWhatsAppPageBootstrap() {
  const auth = await getShellUser();

  if (!auth) {
    return null;
  }

  const settings = await getOrCreateUserSettings(auth.appUser.id);
  const connections = await prisma.whatsAppConnection.findMany({
    where: { userId: auth.appUser.id, channel: "whatsapp" },
    orderBy: { createdAt: "desc" },
  });

  return {
    user: serializeSettingsUser(auth.appUser),
    settings: {
      ...settings,
      notificationPrefs: normalizeNotificationPrefs(settings.notificationPrefs),
      createdAt: settings.createdAt.toISOString(),
      updatedAt: settings.updatedAt.toISOString(),
    } satisfies SettingsResponse["settings"],
    connections: connections.map(sanitizeConnection),
  };
}

export async function getDashboardBootstrap() {
  const auth = await getShellUser();

  if (!auth) {
    return null;
  }

  const settings = await getOrCreateUserSettings(auth.appUser.id);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const [connections, messages, knowledgeCount, productCount, monthlyLeadsCount] = await Promise.all([
    prisma.whatsAppConnection.findMany({
      where: { userId: auth.appUser.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.message.findMany({
      where: { userId: auth.appUser.id },
      take: 20,
      orderBy: { createdAt: "desc" },
      select: dashboardMessageSelect,
    }),
    prisma.knowledgeBaseEntry.count({
      where: { userId: auth.appUser.id },
    }),
    prisma.product.count({
      where: { userId: auth.appUser.id },
    }),
    prisma.lead.count({
      where: {
        userId: auth.appUser.id,
        status: { not: "dismissed" },
        detectedAt: { gte: monthStart },
      },
    }),
  ]);

  const hasConnection = connections.some((connection) => connection.isActive && connection.isVerified);
  const hasBusinessInfo = Boolean(settings.businessName?.trim()) && Boolean(settings.businessContext?.trim());
  const hasAiActivity = messages.some((message) => message.direction === "OUTBOUND" && Boolean(message.aiModelUsed));
  const hasLaunchBasics = hasConnection && hasBusinessInfo && productCount > 0 && knowledgeCount >= 3;
  const handoffPairs = messages.map((message) => ({
    connectionId: message.connectionId,
    customerPhone: message.direction === "OUTBOUND" ? message.toNumber : message.fromNumber,
  }));
  const handoffs =
    handoffPairs.length > 0
      ? await prisma.conversationHandoff.findMany({
          where: {
            userId: auth.appUser.id,
            OR: handoffPairs,
          },
          select: {
            connectionId: true,
            customerPhone: true,
            active: true,
            handoffAt: true,
            resolvedAt: true,
            rating: true,
            ratingRequestedAt: true,
          },
        })
      : [];
  const handoffMap = new Map(
    handoffs.map((handoff) => [
      `${handoff.connectionId}:${handoff.customerPhone}`,
      {
        active: handoff.active,
        handoffAt: handoff.handoffAt,
        resolvedAt: handoff.resolvedAt,
        rating: handoff.rating,
        ratingRequestedAt: handoff.ratingRequestedAt,
      },
    ]),
  );

  return {
    user: serializeSettingsUser(auth.appUser),
    settings: {
      ...settings,
      notificationPrefs: normalizeNotificationPrefs(settings.notificationPrefs),
      createdAt: settings.createdAt.toISOString(),
      updatedAt: settings.updatedAt.toISOString(),
    } satisfies SettingsResponse["settings"],
    connections: connections.map(sanitizeConnection),
    messages: messages.map((message) => {
      const customerPhone = message.direction === "OUTBOUND" ? message.toNumber : message.fromNumber;
      const key = `${message.connectionId}:${customerPhone}`;
      const handoff = handoffMap.get(key);

      return serializeMessage({
        ...message,
        handoffActive: Boolean(handoff?.active),
        handoffAt: handoff?.handoffAt ?? null,
        resolvedAt: handoff?.resolvedAt ?? null,
        rating: handoff?.rating ?? null,
        ratingRequestedAt: handoff?.ratingRequestedAt ?? null,
      });
    }),
    monthlyLeadsCount,
    onboarding: {
      completed: auth.appUser.onboardingCompleted,
      hasConnection,
      hasBusinessInfo,
      hasProduct: productCount > 0,
      hasKnowledge: knowledgeCount > 0,
      knowledgeCount,
      hasAiActivity,
      hasLaunchBasics,
    },
  };
}
