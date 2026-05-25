import "server-only";

import type { WhatsAppConnection } from "@prisma/client";

import { prisma } from "@/lib/prisma/client";
import { encrypt } from "@/lib/utils/encryption";
import { appEnv } from "@/lib/utils/env";
import type { PermissionRequirement } from "@/lib/meta/permissions";
import { hasPermissionRequirements } from "@/lib/meta/permissions";

export type MetaPermissionStatus = "unknown" | "granted" | "partial" | "pending_review" | "error";

export type MetaPageConnectionInput = {
  userId: string;
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  pagePicture?: string | null;
  permissions: string[];
  permissionStatus: MetaPermissionStatus;
  webhookSubscribed: boolean;
};

export type MetaInstagramConnectionInput = {
  userId: string;
  pageConnection: WhatsAppConnection;
  instagramAccountId: string;
  instagramUsername?: string | null;
  instagramProfilePicture?: string | null;
  permissions: string[];
  permissionStatus: MetaPermissionStatus;
};

export function hasRequiredPermissions(grantedPerms: string[], requiredPerms: string[]): boolean {
  return requiredPerms.every((permission) => grantedPerms.includes(permission));
}

export function hasRequiredPermissionGroups(grantedPerms: string[], requirements: PermissionRequirement[]): boolean {
  return hasPermissionRequirements(grantedPerms, requirements);
}

export async function getGrantedPermissions(accessToken: string): Promise<string[]> {
  const res = await fetch(`https://graph.facebook.com/${appEnv.WHATSAPP_API_VERSION}/me/permissions?access_token=${encodeURIComponent(accessToken)}`);
  const data = await res.json().catch(() => ({}));

  if (!res.ok || !Array.isArray(data.data)) {
    return [];
  }

  return data.data
    .filter((permission: { status?: string; permission?: string }) => permission.status === "granted" && typeof permission.permission === "string")
    .map((permission: { permission: string }) => permission.permission);
}

export async function subscribePageToWebhook(pageId: string, pageAccessToken: string): Promise<boolean> {
  const res = await fetch(`https://graph.facebook.com/${appEnv.WHATSAPP_API_VERSION}/${pageId}/subscribed_apps`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${pageAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subscribed_fields: ["messages", "messaging_postbacks", "message_deliveries"],
    }),
  });

  return res.ok;
}

export async function upsertMessengerConnection(input: MetaPageConnectionInput): Promise<WhatsAppConnection> {
  const encryptedPageToken = encrypt(input.pageAccessToken);
  const existing = await prisma.whatsAppConnection.findFirst({
    where: {
      userId: input.userId,
      channel: "messenger",
      facebookPageId: input.pageId,
    },
  });
  const data = {
    userId: input.userId,
    phoneNumberId: input.pageId,
    businessAccountId: input.pageId,
    accessToken: encryptedPageToken,
    webhookVerifyToken: appEnv.WHATSAPP_VERIFY_TOKEN,
    displayName: input.pageName,
    channel: "messenger",
    provider: "meta",
    facebookPageId: input.pageId,
    facebookPageName: input.pageName,
    facebookPagePicture: input.pagePicture ?? null,
    pageAccessTokenEncrypted: encryptedPageToken,
    permissions: input.permissions,
    permissionStatus: input.permissionStatus,
    lastVerifiedAt: new Date(),
    webhookSubscribed: input.webhookSubscribed,
    isActive: input.permissionStatus === "granted",
    isVerified: input.permissionStatus === "granted",
  };

  if (existing) {
    return prisma.whatsAppConnection.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.whatsAppConnection.create({ data });
}

export async function upsertInstagramConnection(input: MetaInstagramConnectionInput): Promise<WhatsAppConnection> {
  const existing = await prisma.whatsAppConnection.findFirst({
    where: {
      userId: input.userId,
      channel: "instagram",
      instagramAccountId: input.instagramAccountId,
    },
  });
  const data = {
    userId: input.userId,
    phoneNumberId: input.instagramAccountId,
    businessAccountId: input.pageConnection.facebookPageId ?? input.pageConnection.phoneNumberId,
    accessToken: input.pageConnection.pageAccessTokenEncrypted ?? input.pageConnection.accessToken,
    webhookVerifyToken: appEnv.WHATSAPP_VERIFY_TOKEN,
    displayName: input.instagramUsername ? `@${input.instagramUsername}` : "Instagram",
    channel: "instagram",
    provider: "meta",
    facebookPageId: input.pageConnection.facebookPageId,
    facebookPageName: input.pageConnection.facebookPageName,
    facebookPagePicture: input.pageConnection.facebookPagePicture,
    instagramAccountId: input.instagramAccountId,
    instagramUsername: input.instagramUsername ?? null,
    instagramProfilePicture: input.instagramProfilePicture ?? null,
    pageAccessTokenEncrypted: input.pageConnection.pageAccessTokenEncrypted ?? input.pageConnection.accessToken,
    permissions: input.permissions,
    permissionStatus: input.permissionStatus,
    lastVerifiedAt: new Date(),
    webhookSubscribed: input.pageConnection.webhookSubscribed,
    isActive: input.permissionStatus === "granted",
    isVerified: input.permissionStatus === "granted",
  };

  if (existing) {
    return prisma.whatsAppConnection.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.whatsAppConnection.create({ data });
}
