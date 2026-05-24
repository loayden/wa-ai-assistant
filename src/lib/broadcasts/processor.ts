// FILE: src/lib/broadcasts/processor.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Broadcast work runs from cron in bounded batches, avoiding
 * request-lifecycle timeouts while preserving Meta-friendly send pacing.
 */
import "server-only";

import type { Broadcast, BroadcastRecipient, MessageTemplate } from "@prisma/client";

import { whatsappClient } from "@/lib/api/whatsapp";
import { BROADCAST_DELAY_MS, delay } from "@/lib/broadcasts/utils";
import { prisma } from "@/lib/prisma/client";
import { languageCodeForTemplate } from "@/lib/templates/meta";
import { getOwnedConnectionForTemplates } from "@/lib/templates/service";
import type { OwnedConnectionWithToken } from "@/lib/templates/service";
import { logger } from "@/lib/utils/logger";

export const BROADCAST_CRON_BATCH_SIZE = 50;
export const BROADCAST_CRON_MAX_ACTIVE = 3;

type BroadcastWithTemplate = Broadcast & {
  template: MessageTemplate | null;
};

type ProcessBroadcastQueueOptions = {
  maxBroadcasts?: number;
  batchSize?: number;
  delayMs?: number;
};

async function refreshBroadcastCounts(broadcastId: string): Promise<{ sent: number; failed: number; pending: number }> {
  const [sent, failed, pending] = await Promise.all([
    prisma.broadcastRecipient.count({ where: { broadcastId, status: "sent" } }),
    prisma.broadcastRecipient.count({ where: { broadcastId, status: "failed" } }),
    prisma.broadcastRecipient.count({ where: { broadcastId, status: "pending" } }),
  ]);

  await prisma.broadcast.update({
    where: { id: broadcastId },
    data: {
      sentCount: sent,
      failedCount: failed,
    },
  });

  return { sent, failed, pending };
}

async function sendBroadcastRecipient(
  broadcast: BroadcastWithTemplate,
  recipient: BroadcastRecipient,
  connection: OwnedConnectionWithToken,
): Promise<"sent" | "failed"> {
  if (!broadcast.template) {
    throw new Error("Broadcast template is missing.");
  }

  const parameters = Array.isArray(broadcast.parameters) ? broadcast.parameters.map(String) : [];

  await whatsappClient.sendTemplateMessage(
    connection.phoneNumberId,
    recipient.phone,
    broadcast.template.name,
    languageCodeForTemplate(broadcast.template.language === "en" ? "en" : "ar"),
    parameters,
    { accessToken: connection.decryptedAccessToken },
  );

  return "sent";
}

async function processBroadcastBatch(
  broadcast: BroadcastWithTemplate,
  recipients: BroadcastRecipient[],
  delayMs: number,
): Promise<void> {
  if (!broadcast.template) {
    await prisma.broadcast.update({
      where: { id: broadcast.id },
      data: { status: "failed", completedAt: new Date() },
    });
    return;
  }
  const connection = await getOwnedConnectionForTemplates(
    broadcast.userId,
    broadcast.connectionId ?? broadcast.template.connectionId ?? undefined,
  );

  if (!connection) {
    await prisma.broadcast.update({
      where: { id: broadcast.id },
      data: { status: "failed", completedAt: new Date() },
    });
    return;
  }

  for (const [index, recipient] of recipients.entries()) {
    try {
      await sendBroadcastRecipient(broadcast, recipient, connection);
      await prisma.broadcastRecipient.update({
        where: { id: recipient.id },
        data: { status: "sent", sentAt: new Date(), errorMessage: null },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Template send failed.";

      await prisma.broadcastRecipient.update({
        where: { id: recipient.id },
        data: { status: "failed", errorMessage: message },
      });
      logger.warn("broadcasts.processor", "Broadcast recipient failed.", {
        error,
        broadcastId: broadcast.id,
        recipientId: recipient.id,
      });
    }

    if (index < recipients.length - 1) {
      await delay(delayMs);
    }
  }
}

export async function processBroadcastQueue(options: ProcessBroadcastQueueOptions = {}) {
  const maxBroadcasts = options.maxBroadcasts ?? BROADCAST_CRON_MAX_ACTIVE;
  const batchSize = options.batchSize ?? BROADCAST_CRON_BATCH_SIZE;
  const delayMs = options.delayMs ?? BROADCAST_DELAY_MS;
  const activeBroadcasts = await prisma.broadcast.findMany({
    where: { status: "sending" },
    orderBy: [{ startedAt: "asc" }, { createdAt: "asc" }],
    take: maxBroadcasts,
    include: { template: true },
  });
  let processedRecipients = 0;
  let completedBroadcasts = 0;

  for (const broadcast of activeBroadcasts) {
    const recipients = await prisma.broadcastRecipient.findMany({
      where: {
        broadcastId: broadcast.id,
        status: "pending",
      },
      orderBy: { createdAt: "asc" },
      take: batchSize,
    });

    if (recipients.length === 0) {
      const counts = await refreshBroadcastCounts(broadcast.id);

      await prisma.broadcast.update({
        where: { id: broadcast.id },
        data: {
          status: "completed",
          sentCount: counts.sent,
          failedCount: counts.failed,
          completedAt: new Date(),
        },
      });
      completedBroadcasts += 1;
      continue;
    }

    await processBroadcastBatch(broadcast, recipients, delayMs);
    processedRecipients += recipients.length;

    const counts = await refreshBroadcastCounts(broadcast.id);

    if (counts.pending === 0) {
      await prisma.broadcast.update({
        where: { id: broadcast.id },
        data: {
          status: "completed",
          sentCount: counts.sent,
          failedCount: counts.failed,
          completedAt: new Date(),
        },
      });
      completedBroadcasts += 1;
    }
  }

  return {
    activeBroadcasts: activeBroadcasts.length,
    processedRecipients,
    completedBroadcasts,
  };
}
