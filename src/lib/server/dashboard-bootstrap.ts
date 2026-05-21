import "server-only";

import type { MessageResponse, SettingsResponse } from "@/types/api";
import { ensureAppUser } from "@/lib/api/auth";
import { getOrCreateUserSettings } from "@/lib/api/settings";
import { sanitizeConnection } from "@/lib/api/whatsapp";
import { prisma } from "@/lib/prisma/client";
import { getUser } from "@/lib/supabase/server";

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
  } | null;
}): MessageResponse {
  return {
    ...message,
    processedAt: message.processedAt?.toISOString() ?? null,
    createdAt: message.createdAt.toISOString(),
    updatedAt: message.updatedAt.toISOString(),
    connection: message.connection ?? undefined,
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
    where: { userId: auth.appUser.id },
    orderBy: { createdAt: "desc" },
  });

  return {
    user: {
      id: auth.appUser.id,
      email: auth.appUser.email,
      fullName: auth.appUser.fullName,
      avatarUrl: auth.appUser.avatarUrl,
      planTier: auth.appUser.planTier,
      subscriptionStatus: auth.appUser.subscriptionStatus,
      monthlyReplyCount: auth.appUser.monthlyReplyCount,
      replyCountResetAt: auth.appUser.replyCountResetAt.toISOString(),
      paymentCustomerId: auth.appUser.paymentCustomerId,
      paymentSubscriptionId: auth.appUser.paymentSubscriptionId,
    } satisfies SettingsResponse["user"],
    settings: {
      ...settings,
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
  const [connections, messages] = await Promise.all([
    prisma.whatsAppConnection.findMany({
      where: { userId: auth.appUser.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.message.findMany({
      where: { userId: auth.appUser.id },
      take: 20,
      orderBy: { createdAt: "desc" },
      include: {
        connection: {
          select: {
            id: true,
            displayName: true,
            phoneNumberId: true,
          },
        },
      },
    }),
  ]);

  return {
    user: {
      id: auth.appUser.id,
      email: auth.appUser.email,
      fullName: auth.appUser.fullName,
      avatarUrl: auth.appUser.avatarUrl,
      planTier: auth.appUser.planTier,
      subscriptionStatus: auth.appUser.subscriptionStatus,
      monthlyReplyCount: auth.appUser.monthlyReplyCount,
      replyCountResetAt: auth.appUser.replyCountResetAt.toISOString(),
      paymentCustomerId: auth.appUser.paymentCustomerId,
      paymentSubscriptionId: auth.appUser.paymentSubscriptionId,
    } satisfies SettingsResponse["user"],
    settings: {
      ...settings,
      createdAt: settings.createdAt.toISOString(),
      updatedAt: settings.updatedAt.toISOString(),
    } satisfies SettingsResponse["settings"],
    connections: connections.map(sanitizeConnection),
    messages: messages.map(serializeMessage),
  };
}
