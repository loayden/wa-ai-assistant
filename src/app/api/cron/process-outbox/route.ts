/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Outbound retries run from a bounded cron endpoint so transient Meta
 * failures recover without blocking webhook requests or retrying setup errors.
 */
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess } from "@/lib/api/response";
import { processOutboundQueue } from "@/lib/reliability/outbox";
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
    const result = await processOutboundQueue();

    logger.info("api.cron.process-outbox", "Outbound queue processed.", result);

    return jsonSuccess(result);
  } catch (error) {
    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.cron.process-outbox", error);

    if (databaseErrorResponse) return databaseErrorResponse;

    logger.error("api.cron.process-outbox", "Outbound queue processing failed.", { error });
    return jsonError("Outbound queue processing failed.", 500);
  }
}
