// FILE: src/app/api/whatsapp/connect/route.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: WhatsApp credentials are encrypted before persistence and all
 * connection reads/deletes are scoped to the authenticated tenant.
 */
import { PlanTier } from "@prisma/client";
import { z } from "zod";

import { requireAppUser, UnauthorizedError } from "@/lib/api/auth";
import { InvalidJsonError, readJsonRequestBody } from "@/lib/api/request";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess, jsonValidationError } from "@/lib/api/response";
import { sanitizeConnection, whatsappClient } from "@/lib/api/whatsapp";
import { prisma } from "@/lib/prisma/client";
import { encrypt } from "@/lib/utils/encryption";
import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";
import { connectWhatsAppSchema } from "@/lib/validators/whatsapp";
import { EmbeddedSignupError, getPhoneProfile } from "@/lib/whatsapp/embedded-signup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const deleteConnectionQuerySchema = z.object({
  id: z.string().uuid(),
});

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

function resolveConnectionName(
  displayName?: string | null,
  phoneProfile?: { verified_name?: string; display_phone_number?: string },
): string | null {
  return displayName || phoneProfile?.verified_name || phoneProfile?.display_phone_number || null;
}

export async function GET() {
  try {
    const user = await requireAppUser();
    const connections = await prisma.whatsAppConnection.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return jsonSuccess({ connections: connections.map(sanitizeConnection) });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(error.message, 401);
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.whatsapp.connect.get", error);

    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }

    logger.error("api.whatsapp.connect.get", "Failed to load WhatsApp connections.", { error });
    return jsonError("Failed to load WhatsApp connections.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const body = await readJsonRequestBody(request);
    const parsed = connectWhatsAppSchema.safeParse(body);

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

    const connectionCount = await prisma.whatsAppConnection.count({
      where: { userId: user.id },
    });

    if (connectionCount >= getMaxConnectionCount(user.planTier)) {
      return jsonError("WhatsApp connection limit reached for current plan.", 403);
    }

    const phoneProfile = appEnv.WHATSAPP_MOCK_MODE
      ? undefined
      : await getPhoneProfile(parsed.data.phoneNumberId, parsed.data.accessToken);

    const connection = await prisma.whatsAppConnection.create({
      data: {
        userId: user.id,
        phoneNumberId: parsed.data.phoneNumberId,
        businessAccountId: parsed.data.businessAccountId,
        accessToken: encrypt(parsed.data.accessToken),
        webhookVerifyToken: appEnv.WHATSAPP_VERIFY_TOKEN,
        displayName: resolveConnectionName(parsed.data.displayName, phoneProfile),
        ownerPhoneNumber:
          normalizeOwnerPhoneNumber(parsed.data.ownerPhoneNumber) ??
          normalizeOwnerPhoneNumber(phoneProfile?.display_phone_number),
        isActive: true,
        isVerified: true,
      },
    });

    if (appEnv.WHATSAPP_MOCK_MODE) {
      await whatsappClient.sendMessage(connection.phoneNumberId, "15555550100", "Mock WhatsApp connection verified.");
    }

    return jsonSuccess({ connection: sanitizeConnection(connection) }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(error.message, 401);
    }

    if (error instanceof InvalidJsonError) {
      return jsonError(error.message, 400);
    }

    if (error instanceof EmbeddedSignupError) {
      return jsonError("The Meta credentials could not be verified. Check the number ID, business account ID, and access token.", 502);
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.whatsapp.connect.post", error);

    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }

    logger.error("api.whatsapp.connect.post", "Failed to create WhatsApp connection.", { error });
    return jsonError("Failed to create WhatsApp connection.", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireAppUser();
    const { searchParams } = new URL(request.url);
    const parsed = deleteConnectionQuerySchema.safeParse(Object.fromEntries(searchParams));

    if (!parsed.success) {
      return jsonValidationError(parsed.error);
    }

    const connection = await prisma.whatsAppConnection.findFirst({
      where: {
        id: parsed.data.id,
        userId: user.id,
      },
    });

    if (!connection) {
      return jsonError("WhatsApp connection not found.", 404);
    }

    await prisma.whatsAppConnection.delete({
      where: { id: connection.id },
    });

    return jsonSuccess({ deleted: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(error.message, 401);
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.whatsapp.connect.delete", error);

    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }

    logger.error("api.whatsapp.connect.delete", "Failed to delete WhatsApp connection.", { error });
    return jsonError("Failed to delete WhatsApp connection.", 500);
  }
}
