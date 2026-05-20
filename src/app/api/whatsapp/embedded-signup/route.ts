// FILE: src/app/api/whatsapp/embedded-signup/route.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Embedded Signup completion is finalized on the server so OAuth code
 * exchange, webhook subscription, and encrypted token storage never touch the browser.
 */
import { PlanTier } from "@prisma/client";

import { requireAppUser, UnauthorizedError } from "@/lib/api/auth";
import { InvalidJsonError, readJsonRequestBody } from "@/lib/api/request";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess, jsonValidationError } from "@/lib/api/response";
import { sanitizeConnection } from "@/lib/api/whatsapp";
import { prisma } from "@/lib/prisma/client";
import { encrypt } from "@/lib/utils/encryption";
import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";
import { embeddedSignupExchangeSchema } from "@/lib/validators/whatsapp";
import { EmbeddedSignupError, exchangeEmbeddedSignupCode, getPhoneProfile, subscribeAppToBusinessAccount } from "@/lib/whatsapp/embedded-signup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getMaxConnectionCount(planTier: PlanTier): number {
  switch (planTier) {
    case PlanTier.BUSINESS:
      return 10;
    case PlanTier.PRO:
      return 3;
    default:
      return 1;
  }
}

function normalizeOwnerPhoneNumber(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const digits = value.replace(/\D/g, "");
  return digits || null;
}

function resolveConnectionName(phoneProfile?: { verified_name?: string; display_phone_number?: string }): string {
  return phoneProfile?.verified_name || phoneProfile?.display_phone_number || "WhatsApp connected";
}

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const body = await readJsonRequestBody(request);
    const parsed = embeddedSignupExchangeSchema.safeParse(body);

    if (!parsed.success) {
      return jsonValidationError(parsed.error);
    }

    const conflictingConnection = await prisma.whatsAppConnection.findFirst({
      where: {
        phoneNumberId: parsed.data.phoneNumberId,
        userId: { not: user.id },
      },
      select: { id: true },
    });

    if (conflictingConnection) {
      return jsonError("This WhatsApp number is already connected to another workspace.", 409);
    }

    const existingConnection = await prisma.whatsAppConnection.findFirst({
      where: {
        userId: user.id,
        OR: [
          { phoneNumberId: parsed.data.phoneNumberId },
          { businessAccountId: parsed.data.businessAccountId },
        ],
      },
    });

    if (!existingConnection) {
      const connectionCount = await prisma.whatsAppConnection.count({
        where: { userId: user.id },
      });

      if (connectionCount >= getMaxConnectionCount(user.planTier)) {
        return jsonError("WhatsApp connection limit reached for current plan.", 403);
      }
    }

    const accessToken = await exchangeEmbeddedSignupCode(parsed.data.code);
    await subscribeAppToBusinessAccount(parsed.data.businessAccountId, accessToken);

    let phoneProfile:
      | {
          display_phone_number?: string;
          verified_name?: string;
        }
      | undefined;

    try {
      phoneProfile = await getPhoneProfile(parsed.data.phoneNumberId, accessToken);
    } catch (error) {
      logger.warn("api.whatsapp.embedded-signup.post", "Embedded signup connected without phone profile enrichment.", {
        error,
        userId: user.id,
        phoneNumberId: parsed.data.phoneNumberId,
      });
    }

    const persistedConnection = existingConnection
      ? await prisma.whatsAppConnection.update({
          where: { id: existingConnection.id },
          data: {
            phoneNumberId: parsed.data.phoneNumberId,
            businessAccountId: parsed.data.businessAccountId,
            accessToken: encrypt(accessToken),
            webhookVerifyToken: appEnv.WHATSAPP_VERIFY_TOKEN,
            displayName: resolveConnectionName(phoneProfile),
            ownerPhoneNumber: normalizeOwnerPhoneNumber(phoneProfile?.display_phone_number),
            isActive: true,
            isVerified: true,
          },
        })
      : await prisma.whatsAppConnection.create({
          data: {
            userId: user.id,
            phoneNumberId: parsed.data.phoneNumberId,
            businessAccountId: parsed.data.businessAccountId,
            accessToken: encrypt(accessToken),
            webhookVerifyToken: appEnv.WHATSAPP_VERIFY_TOKEN,
            displayName: resolveConnectionName(phoneProfile),
            ownerPhoneNumber: normalizeOwnerPhoneNumber(phoneProfile?.display_phone_number),
            isActive: true,
            isVerified: true,
          },
        });

    return jsonSuccess(
      { connection: sanitizeConnection(persistedConnection) },
      { status: existingConnection ? 200 : 201 },
    );
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(error.message, 401);
    }

    if (error instanceof InvalidJsonError) {
      return jsonError(error.message, 400);
    }

    if (error instanceof EmbeddedSignupError) {
      return jsonError("Meta could not complete WhatsApp onboarding for this business. Please try again.", 502);
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.whatsapp.embedded-signup.post", error);

    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }

    logger.error("api.whatsapp.embedded-signup.post", "Failed to finalize WhatsApp embedded signup.", { error });
    return jsonError("Failed to finalize WhatsApp onboarding.", 500);
  }
}
