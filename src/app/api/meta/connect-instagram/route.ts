import { z } from "zod";

import { requireAppUser, UnauthorizedError } from "@/lib/api/auth";
import { InvalidJsonError, readJsonRequestBody } from "@/lib/api/request";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess, jsonValidationError } from "@/lib/api/response";
import { sanitizeConnection } from "@/lib/api/whatsapp";
import { INSTAGRAM_DM_PERMISSION_REQUIREMENTS, missingPermissionLabels } from "@/lib/meta/permissions";
import { hasRequiredPermissionGroups, inspectMetaAccessToken, upsertInstagramConnection } from "@/lib/meta/social";
import { prisma } from "@/lib/prisma/client";
import { decrypt } from "@/lib/utils/encryption";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const connectInstagramSchema = z
  .object({
    pageId: z.string().min(1),
    instagramAccountId: z.string().min(1),
    instagramUsername: z.string().optional().nullable(),
    instagramProfilePicture: z.string().url().optional().nullable(),
  })
  .strict();

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const body = await readJsonRequestBody(request);
    const parsed = connectInstagramSchema.safeParse(body);

    if (!parsed.success) {
      return jsonValidationError(parsed.error);
    }

    const pageConnection = await prisma.whatsAppConnection.findFirst({
      where: {
        userId: user.id,
        channel: "messenger",
        facebookPageId: parsed.data.pageId,
      },
    });

    if (!pageConnection?.pageAccessTokenEncrypted) {
      return jsonError("اربط صفحة Facebook أولاً قبل ربط إنستجرام.", 400);
    }

    const pageAccessToken = decrypt(pageConnection.pageAccessTokenEncrypted);
    const tokenInspection = await inspectMetaAccessToken(pageAccessToken);
    const permissions = tokenInspection.permissions;
    const hasAllPermissions = hasRequiredPermissionGroups(permissions, INSTAGRAM_DM_PERMISSION_REQUIREMENTS);
    const permissionStatus = hasAllPermissions ? "granted" : "partial";
    const connection = await upsertInstagramConnection({
      userId: user.id,
      pageConnection,
      instagramAccountId: parsed.data.instagramAccountId,
      instagramUsername: parsed.data.instagramUsername,
      instagramProfilePicture: parsed.data.instagramProfilePicture,
      permissions,
      permissionStatus,
    });

    return jsonSuccess({
      connection: sanitizeConnection(connection),
      permissionStatus,
      permissions,
      missingPermissions: missingPermissionLabels(permissions, INSTAGRAM_DM_PERMISSION_REQUIREMENTS),
      tokenExpiresAt: tokenInspection.expiresAt,
      permissionSources: tokenInspection.sources,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(error.message, 401);
    }

    if (error instanceof InvalidJsonError) {
      return jsonError(error.message, 400);
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.meta.connect-instagram", error);

    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }

    logger.error("api.meta.connect-instagram", "Failed to connect Instagram account.", { error });
    return jsonError("فشل ربط إنستجرام.", 500);
  }
}
