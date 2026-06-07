import "server-only";

import type { WhatsAppConnection } from "@prisma/client";

import { prisma } from "@/lib/prisma/client";
import { encrypt } from "@/lib/utils/encryption";
import { appEnv } from "@/lib/utils/env";
import type { PermissionRequirement } from "@/lib/meta/permissions";
import { hasPermissionRequirements } from "@/lib/meta/permissions";

export type MetaPermissionStatus = "unknown" | "granted" | "partial" | "pending_review" | "error";

export type MetaTokenInspection = {
  permissions: string[];
  expiresAt: string | null;
  isValid: boolean | null;
  tokenType: string | null;
  sources: {
    mePermissions: boolean;
    debugToken: boolean;
  };
};

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

function uniquePermissions(permissions: string[]): string[] {
  return Array.from(new Set(permissions.filter((permission) => typeof permission === "string" && permission.length > 0))).sort();
}

async function getPermissionsFromMePermissions(accessToken: string): Promise<{ permissions: string[]; ok: boolean }> {
  const res = await fetch(`https://graph.facebook.com/${appEnv.WHATSAPP_API_VERSION}/me/permissions?access_token=${encodeURIComponent(accessToken)}`);
  const data = await res.json().catch(() => ({}));

  if (!res.ok || !Array.isArray(data.data)) {
    return { permissions: [], ok: false };
  }

  return {
    ok: true,
    permissions: data.data
      .filter((permission: { status?: string; permission?: string }) => permission.status === "granted" && typeof permission.permission === "string")
      .map((permission: { permission: string }) => permission.permission),
  };
}

async function inspectDebugToken(accessToken: string): Promise<Omit<MetaTokenInspection, "sources" | "permissions"> & { permissions: string[]; ok: boolean }> {
  const appAccessToken = `${appEnv.WHATSAPP_APP_ID}|${appEnv.WHATSAPP_APP_SECRET}`;
  const params = new URLSearchParams({
    input_token: accessToken,
    access_token: appAccessToken,
  });
  const res = await fetch(`https://graph.facebook.com/${appEnv.WHATSAPP_API_VERSION}/debug_token?${params.toString()}`);
  const data = await res.json().catch(() => ({}));
  const scopes = data?.data?.scopes;

  if (!res.ok || !Array.isArray(scopes)) {
    return {
      ok: false,
      permissions: [],
      expiresAt: null,
      isValid: typeof data?.data?.is_valid === "boolean" ? data.data.is_valid : null,
      tokenType: typeof data?.data?.type === "string" ? data.data.type : null,
    };
  }

  const expiresAtSeconds = typeof data?.data?.expires_at === "number" ? data.data.expires_at : 0;

  return {
    ok: true,
    permissions: scopes.filter((scope: unknown): scope is string => typeof scope === "string"),
    expiresAt: expiresAtSeconds > 0 ? new Date(expiresAtSeconds * 1000).toISOString() : null,
    isValid: typeof data?.data?.is_valid === "boolean" ? data.data.is_valid : null,
    tokenType: typeof data?.data?.type === "string" ? data.data.type : null,
  };
}

export async function inspectMetaAccessToken(accessToken: string): Promise<MetaTokenInspection> {
  const [directPermissions, tokenInspection] = await Promise.all([
    getPermissionsFromMePermissions(accessToken),
    inspectDebugToken(accessToken),
  ]);

  return {
    permissions: uniquePermissions([...directPermissions.permissions, ...tokenInspection.permissions]),
    expiresAt: tokenInspection.expiresAt,
    isValid: tokenInspection.isValid,
    tokenType: tokenInspection.tokenType,
    sources: {
      mePermissions: directPermissions.ok,
      debugToken: tokenInspection.ok,
    },
  };
}

export async function getGrantedPermissions(accessToken: string): Promise<string[]> {
  const inspection = await inspectMetaAccessToken(accessToken);

  return inspection.permissions;
}

const REQUIRED_PAGE_WEBHOOK_FIELDS = ["messages", "messaging_postbacks", "message_deliveries"];

function subscriptionMatchesCurrentApp(subscription: { id?: unknown; subscribed_fields?: unknown }) {
  if (subscription.id !== appEnv.WHATSAPP_APP_ID) {
    return false;
  }

  const subscribedFields = subscription.subscribed_fields;

  if (!Array.isArray(subscribedFields)) {
    return true;
  }

  return REQUIRED_PAGE_WEBHOOK_FIELDS.every((field) => subscribedFields.includes(field));
}

export async function verifyPageWebhookSubscription(pageId: string, pageAccessToken: string): Promise<boolean> {
  const params = new URLSearchParams({
    fields: "id,name,subscribed_fields",
  });
  const res = await fetch(`https://graph.facebook.com/${appEnv.WHATSAPP_API_VERSION}/${pageId}/subscribed_apps?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${pageAccessToken}`,
    },
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok || !Array.isArray(data.data)) {
    return false;
  }

  return data.data.some((subscription: { id?: unknown; subscribed_fields?: unknown }) => subscriptionMatchesCurrentApp(subscription));
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

  if (!res.ok) {
    return false;
  }

  return verifyPageWebhookSubscription(pageId, pageAccessToken);
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
