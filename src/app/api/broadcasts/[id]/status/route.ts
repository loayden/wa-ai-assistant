// FILE: src/app/api/broadcasts/[id]/status/route.ts
import { requireAppUser, UnauthorizedError } from "@/lib/api/auth";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonMethodNotAllowed, jsonSuccess } from "@/lib/api/response";
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/utils/logger";
import type { BroadcastStatusResponse } from "@/types/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const user = await requireAppUser();
    const broadcast = await prisma.broadcast.findFirst({
      where: { id, userId: user.id },
      select: {
        status: true,
        recipientCount: true,
        sentCount: true,
        failedCount: true,
      },
    });

    if (!broadcast) {
      return jsonError("Broadcast not found.", 404);
    }

    return jsonSuccess<BroadcastStatusResponse>({
      status: broadcast.status as BroadcastStatusResponse["status"],
      recipientCount: broadcast.recipientCount,
      sentCount: broadcast.sentCount,
      failedCount: broadcast.failedCount,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(error.message, 401);

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.broadcasts.status", error);
    if (databaseErrorResponse) return databaseErrorResponse;

    logger.error("api.broadcasts.status", "Failed to load broadcast status.", { error });
    return jsonError("Failed to load broadcast status.", 500);
  }
}

export async function POST() {
  return jsonMethodNotAllowed("POST");
}
