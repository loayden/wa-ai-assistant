// FILE: src/app/api/broadcasts/[id]/process/route.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Hobby-plan deployments cannot run minutely cron jobs, so the
 * authenticated broadcasts page can drain a campaign in small bounded batches.
 */
import { requireAppUser, UnauthorizedError } from "@/lib/api/auth";
import {
  jsonDatabaseUnavailableIfNeeded,
  jsonError,
  jsonMethodNotAllowed,
  jsonSuccess,
} from "@/lib/api/response";
import { processBroadcastQueue } from "@/lib/broadcasts/processor";
import { BROADCAST_DELAY_MS } from "@/lib/broadcasts/utils";
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/utils/logger";
import { checkRateLimit } from "@/lib/utils/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

const CLIENT_BATCH_SIZE = 5;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const user = await requireAppUser();
    const rateLimit = checkRateLimit({
      key: `broadcast-process:${user.id}:${id}`,
      limit: 12,
      windowMs: 60_000,
      context: "api.broadcasts.process",
    });

    if (!rateLimit.allowed) {
      return jsonError("طلبات كثيرة جداً، انتظر قليلاً.", 429, {
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      });
    }

    const broadcast = await prisma.broadcast.findFirst({
      where: { id, userId: user.id },
      select: { id: true, status: true },
    });

    if (!broadcast) {
      return jsonError("Broadcast not found.", 404);
    }

    if (broadcast.status !== "sending") {
      return jsonSuccess({
        activeBroadcasts: 0,
        processedRecipients: 0,
        completedBroadcasts: 0,
      });
    }

    const result = await processBroadcastQueue({
      broadcastId: broadcast.id,
      maxBroadcasts: 1,
      batchSize: CLIENT_BATCH_SIZE,
      delayMs: BROADCAST_DELAY_MS,
    });

    return jsonSuccess(result);
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(error.message, 401);

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.broadcasts.process", error);
    if (databaseErrorResponse) return databaseErrorResponse;

    logger.error("api.broadcasts.process", "Failed to process broadcast batch.", { error });
    return jsonError("Failed to process broadcast batch.", 500);
  }
}

export async function GET() {
  return jsonMethodNotAllowed("GET");
}
