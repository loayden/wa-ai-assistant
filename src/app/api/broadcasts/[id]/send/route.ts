// FILE: src/app/api/broadcasts/[id]/send/route.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Broadcast sending is intentionally sequential with a small delay
 * between recipients to reduce the chance of Meta rate-limit flags.
 */
import { requireAppUser, UnauthorizedError } from "@/lib/api/auth";
import {
  jsonDatabaseUnavailableIfNeeded,
  jsonError,
  jsonMethodNotAllowed,
  jsonSuccess,
} from "@/lib/api/response";
import { whatsappClient } from "@/lib/api/whatsapp";
import { delay } from "@/lib/broadcasts/utils";
import { prisma } from "@/lib/prisma/client";
import { languageCodeForTemplate } from "@/lib/templates/meta";
import { getOwnedConnectionForTemplates } from "@/lib/templates/service";
import { logger } from "@/lib/utils/logger";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import type { BroadcastSendResponse } from "@/types/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function processBroadcastInBackground(userId: string, broadcastId: string) {
  try {
    const broadcast = await prisma.broadcast.findFirst({
      where: { id: broadcastId, userId },
      include: {
        template: true,
        recipients: {
          where: { status: "pending" },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!broadcast || !broadcast.template) {
      return;
    }

    const connection = await getOwnedConnectionForTemplates(
      userId,
      broadcast.connectionId ?? broadcast.template.connectionId ?? undefined,
    );

    if (!connection) {
      await prisma.broadcast.update({
        where: { id: broadcast.id },
        data: { status: "failed", completedAt: new Date() },
      });
      return;
    }

    let sent = broadcast.sentCount;
    let failed = broadcast.failedCount;
    const parameters = Array.isArray(broadcast.parameters) ? broadcast.parameters.map(String) : [];

    for (const [index, recipient] of broadcast.recipients.entries()) {
      try {
        await whatsappClient.sendTemplateMessage(
          connection.phoneNumberId,
          recipient.phone,
          broadcast.template.name,
          languageCodeForTemplate(broadcast.template.language === "en" ? "en" : "ar"),
          parameters,
          { accessToken: connection.decryptedAccessToken },
        );
        await prisma.broadcastRecipient.update({
          where: { id: recipient.id },
          data: { status: "sent", sentAt: new Date() },
        });
        sent += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Template send failed.";
        await prisma.broadcastRecipient.update({
          where: { id: recipient.id },
          data: { status: "failed", errorMessage: message },
        });
        failed += 1;
      }

      await prisma.broadcast.update({
        where: { id: broadcast.id },
        data: {
          sentCount: sent,
          failedCount: failed,
        },
      });

      if (index < broadcast.recipients.length - 1) {
        await delay();
      }
    }

    await prisma.broadcast.update({
      where: { id: broadcast.id },
      data: {
        status: failed > 0 && sent === 0 ? "failed" : "completed",
        sentCount: sent,
        failedCount: failed,
        completedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error("api.broadcasts.send", "Background broadcast processing failed.", { error, broadcastId });
    await prisma.broadcast
      .update({
        where: { id: broadcastId },
        data: { status: "failed", completedAt: new Date() },
      })
      .catch((updateError) => {
        logger.error("api.broadcasts.send", "Failed to mark broadcast as failed.", { error: updateError, broadcastId });
      });
  }
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const user = await requireAppUser();
    const rateLimit = checkRateLimit({
      key: `broadcast-send:${user.id}`,
      limit: 2,
      windowMs: 60_000,
      context: "api.broadcasts.send",
    });

    if (!rateLimit.allowed) {
      return jsonError("طلبات كثيرة جداً، انتظر قليلاً.", 429, {
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      });
    }

    if (user.planTier === "FREE") {
      return jsonError("Broadcast campaigns are available on Pro and Business plans.", 403);
    }

    const broadcast = await prisma.broadcast.findFirst({
      where: { id, userId: user.id },
      include: {
        template: true,
      },
    });

    if (!broadcast || !broadcast.template) {
      return jsonError("Broadcast not found.", 404);
    }

    if (broadcast.template.status !== "approved") {
      return jsonError("Only approved templates can be broadcast.", 409);
    }

    if (broadcast.status === "sending") {
      return jsonError("Broadcast is already sending.", 409);
    }

    const connection = await getOwnedConnectionForTemplates(user.id, broadcast.connectionId ?? broadcast.template.connectionId ?? undefined);

    if (!connection) {
      return jsonError("Connect and verify a WhatsApp number before sending broadcasts.", 404);
    }

    await prisma.broadcast.update({
      where: { id: broadcast.id },
      data: {
        status: "sending",
        startedAt: new Date(),
        completedAt: null,
      },
    });

    void processBroadcastInBackground(user.id, broadcast.id);

    return jsonSuccess<BroadcastSendResponse>(
      { sent: broadcast.sentCount, failed: broadcast.failedCount },
      { status: 202 },
    );
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(error.message, 401);

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.broadcasts.send", error);
    if (databaseErrorResponse) return databaseErrorResponse;

    logger.error("api.broadcasts.send", "Failed to send broadcast.", { error });
    return jsonError("Failed to send broadcast.", 500);
  }
}

export async function GET() {
  return jsonMethodNotAllowed("GET");
}
