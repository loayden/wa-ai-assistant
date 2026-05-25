import { z } from "zod";

import { requireAppUser, UnauthorizedError } from "@/lib/api/auth";
import { InvalidJsonError, readJsonRequestBody } from "@/lib/api/request";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess, jsonValidationError } from "@/lib/api/response";
import { getGrantedPermissions, hasRequiredPermissions, subscribePageToWebhook, upsertMessengerConnection } from "@/lib/meta/social";
import { MESSENGER_PERMISSION_REQUIREMENTS, missingPermissionLabels } from "@/lib/meta/permissions";
import { sanitizeConnection } from "@/lib/api/whatsapp";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const connectPageSchema = z
  .object({
    pageId: z.string().min(1),
    pageName: z.string().min(1),
    pageAccessToken: z.string().min(1),
    pagePicture: z.string().url().optional().nullable(),
  })
  .strict();

const REQUIRED_MESSENGER_PERMISSIONS = ["pages_messaging", "pages_manage_metadata"];

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const body = await readJsonRequestBody(request);
    const parsed = connectPageSchema.safeParse(body);

    if (!parsed.success) {
      return jsonValidationError(parsed.error);
    }

    const permissions = await getGrantedPermissions(parsed.data.pageAccessToken);
    const hasAllPermissions = hasRequiredPermissions(permissions, REQUIRED_MESSENGER_PERMISSIONS);
    const webhookSubscribed = hasAllPermissions
      ? await subscribePageToWebhook(parsed.data.pageId, parsed.data.pageAccessToken)
      : false;
    const permissionStatus = hasAllPermissions && webhookSubscribed ? "granted" : "partial";
    const connection = await upsertMessengerConnection({
      userId: user.id,
      pageId: parsed.data.pageId,
      pageName: parsed.data.pageName,
      pageAccessToken: parsed.data.pageAccessToken,
      pagePicture: parsed.data.pagePicture,
      permissions,
      permissionStatus,
      webhookSubscribed,
    });

    return jsonSuccess({
      connection: sanitizeConnection(connection),
      permissionStatus,
      permissions,
      missingPermissions: missingPermissionLabels(permissions, MESSENGER_PERMISSION_REQUIREMENTS),
      webhookSubscribed,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(error.message, 401);
    }

    if (error instanceof InvalidJsonError) {
      return jsonError(error.message, 400);
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.meta.connect-page", error);

    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }

    logger.error("api.meta.connect-page", "Failed to connect Facebook Page.", { error });
    return jsonError("فشل ربط صفحة Facebook.", 500);
  }
}
