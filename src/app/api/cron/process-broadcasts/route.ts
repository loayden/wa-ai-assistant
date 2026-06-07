// FILE: src/app/api/cron/process-broadcasts/route.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Cron processes broadcast recipients in bounded batches so campaign
 * sending survives serverless request limits and can resume on the next run.
 */
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess } from "@/lib/api/response";
import { processBroadcastQueue } from "@/lib/broadcasts/processor";
import { isAuthorizedCronRequest } from "@/lib/security/cron";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return jsonError("Unauthorized cron request.", 403);
  }

  try {
    const result = await processBroadcastQueue();

    logger.info("api.cron.process-broadcasts", "Broadcast queue processed.", result);

    return jsonSuccess(result);
  } catch (error) {
    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.cron.process-broadcasts", error);

    if (databaseErrorResponse) return databaseErrorResponse;

    logger.error("api.cron.process-broadcasts", "Broadcast queue processing failed.", { error });
    return jsonError("Broadcast queue processing failed.", 500);
  }
}
