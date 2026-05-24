// FILE: src/lib/templates/service.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Template/broadcast routes share tenant-scoped connection lookup and
 * serialization to avoid leaking encrypted credentials or cross-user records.
 */
import "server-only";

import type { Broadcast, BroadcastRecipient, MessageTemplate, WhatsAppConnection } from "@prisma/client";

import { decrypt } from "@/lib/utils/encryption";
import { prisma } from "@/lib/prisma/client";
import type { BroadcastResponse, MessageTemplateResponse } from "@/types/api";

export type OwnedConnectionWithToken = WhatsAppConnection & {
  decryptedAccessToken: string;
};

export async function getOwnedConnectionForTemplates(userId: string, connectionId?: string): Promise<OwnedConnectionWithToken | null> {
  const connection = await prisma.whatsAppConnection.findFirst({
    where: {
      userId,
      id: connectionId,
      isActive: true,
      isVerified: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!connection) {
    return null;
  }

  return {
    ...connection,
    decryptedAccessToken: decrypt(connection.accessToken),
  };
}

export function serializeTemplate(template: MessageTemplate): MessageTemplateResponse {
  return {
    id: template.id,
    userId: template.userId,
    connectionId: template.connectionId,
    name: template.name,
    displayName: template.displayName,
    category: template.category as MessageTemplateResponse["category"],
    language: template.language as MessageTemplateResponse["language"],
    headerText: template.headerText,
    bodyText: template.bodyText,
    footerText: template.footerText,
    buttonText: template.buttonText,
    buttonUrl: template.buttonUrl,
    metaTemplateId: template.metaTemplateId,
    status: template.status as MessageTemplateResponse["status"],
    rejectionReason: template.rejectionReason,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

export function serializeBroadcast(
  broadcast: Broadcast & {
    template?: MessageTemplate | null;
    recipients?: BroadcastRecipient[];
  },
): BroadcastResponse {
  return {
    id: broadcast.id,
    userId: broadcast.userId,
    connectionId: broadcast.connectionId,
    templateId: broadcast.templateId,
    name: broadcast.name,
    parameters: Array.isArray(broadcast.parameters) ? broadcast.parameters.map(String) : [],
    recipientCount: broadcast.recipientCount,
    sentCount: broadcast.sentCount,
    failedCount: broadcast.failedCount,
    status: broadcast.status as BroadcastResponse["status"],
    scheduledAt: broadcast.scheduledAt?.toISOString() ?? null,
    startedAt: broadcast.startedAt?.toISOString() ?? null,
    completedAt: broadcast.completedAt?.toISOString() ?? null,
    createdAt: broadcast.createdAt.toISOString(),
    updatedAt: broadcast.updatedAt.toISOString(),
    template: broadcast.template ? serializeTemplate(broadcast.template) : null,
    recipients:
      broadcast.recipients?.map((recipient) => ({
        id: recipient.id,
        phone: recipient.phone,
        name: recipient.name,
        status: recipient.status as "pending" | "sent" | "failed",
        errorMessage: recipient.errorMessage,
        sentAt: recipient.sentAt?.toISOString() ?? null,
      })) ?? [],
  };
}
