import { z } from "zod";

import { requireAppUser, UnauthorizedError } from "@/lib/api/auth";
import { InvalidJsonError, readJsonRequestBody } from "@/lib/api/request";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess, jsonValidationError } from "@/lib/api/response";
import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const exchangeSchema = z
  .object({
    code: z.string().min(1),
    redirectUri: z.string().url(),
  })
  .strict();

export async function POST(request: Request) {
  try {
    await requireAppUser();
    const body = await readJsonRequestBody(request);
    const parsed = exchangeSchema.safeParse(body);

    if (!parsed.success) {
      return jsonValidationError(parsed.error);
    }

    const tokenRes = await fetch(
      `https://graph.facebook.com/${appEnv.WHATSAPP_API_VERSION}/oauth/access_token?` +
        new URLSearchParams({
          client_id: appEnv.WHATSAPP_APP_ID,
          client_secret: appEnv.WHATSAPP_APP_SECRET,
          code: parsed.data.code,
          redirect_uri: parsed.data.redirectUri,
        }).toString(),
    );
    const tokenData = await tokenRes.json().catch(() => ({}));

    if (!tokenRes.ok || typeof tokenData.access_token !== "string") {
      return jsonError(
        `فشل تبادل رمز Meta. أضيفي هذا الرابط في Valid OAuth Redirect URIs داخل Meta: ${parsed.data.redirectUri}`,
        400,
        { redirectUri: parsed.data.redirectUri },
      );
    }

    const longRes = await fetch(
      `https://graph.facebook.com/${appEnv.WHATSAPP_API_VERSION}/oauth/access_token?` +
        new URLSearchParams({
          grant_type: "fb_exchange_token",
          client_id: appEnv.WHATSAPP_APP_ID,
          client_secret: appEnv.WHATSAPP_APP_SECRET,
          fb_exchange_token: tokenData.access_token,
        }).toString(),
    );
    const longData = await longRes.json().catch(() => ({}));
    const userAccessToken = typeof longData.access_token === "string" ? longData.access_token : tokenData.access_token;

    const pagesRes = await fetch(
      `https://graph.facebook.com/${appEnv.WHATSAPP_API_VERSION}/me/accounts?` +
        new URLSearchParams({
          fields: "id,name,picture,instagram_business_account{id,username,profile_picture_url},access_token",
          access_token: userAccessToken,
        }).toString(),
    );
    const pagesData = await pagesRes.json().catch(() => ({}));

    if (!pagesRes.ok || !Array.isArray(pagesData.data)) {
      return jsonError("لم نتمكن من قراءة صفحات Facebook من Meta.", 400);
    }

    return jsonSuccess({
      pages: pagesData.data,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(error.message, 401);
    }

    if (error instanceof InvalidJsonError) {
      return jsonError(error.message, 400);
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.meta.oauth.exchange", error);

    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }

    logger.error("api.meta.oauth.exchange", "Failed to exchange Meta OAuth code.", { error });
    return jsonError("فشل ربط Meta.", 500);
  }
}
