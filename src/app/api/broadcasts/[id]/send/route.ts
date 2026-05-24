// FILE: src/app/api/broadcasts/[id]/send/route.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Broadcast send requests only enqueue campaign delivery. The cron
 * processor sends recipients in batches so the request lifecycle stays short.
 */
import { requireAppUser, UnauthorizedError } from "@/lib/api/auth";
import {
  jsonDatabaseUnavailableIfNeeded,
  jsonError,
  jsonMethodNotAllowed,
  jsonSuccess,
} from "@/lib/api/response";
import { prisma } from "@/lib/prisma/client";
import { getOwnedConnectionForTemplates } from "@/lib/templates/service";
import { logger } from "@/lib/utils/logger";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import type { BroadcastSendResponse } from "@/types/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
