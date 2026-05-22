// FILE: src/app/api/whatsapp/diagnostics/route.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Manual WhatsApp onboarding needs an authenticated live check so
 * owners can verify credentials, WABA ownership, and webhook subscription after
 * setup without exposing tokens or relying on Meta Embedded Signup.
 */
import { z } from "zod";

import { requireAppUser, UnauthorizedError } from "@/lib/api/auth";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess, jsonValidationError } from "@/lib/api/response";
import { sanitizeConnection } from "@/lib/api/whatsapp";
import { prisma } from "@/lib/prisma/client";
import { decrypt } from "@/lib/utils/encryption";
import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";
import { EmbeddedSignupError, getBusinessAccountPhoneNumber, getPhoneProfile, subscribeAppToBusinessAccount } from "@/lib/whatsapp/embedded-signup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const diagnosticsQuerySchema = z
  .object({
    connectionId: z.string().uuid().optional(),
  })
  .strict();

type DiagnosticStatus = "passed" | "warning" | "failed";

type DiagnosticCheck = {
  id: string;
  label: string;
  status: DiagnosticStatus;
  detail: string;
};

function createCheck(id: string, label: string, status: DiagnosticStatus, detail: string): DiagnosticCheck {
  return { id, label, status, detail };
}

export async function GET(request: Request) {
  try {
    const user = await requireAppUser();
    const { searchParams } = new URL(request.url);
    const parsed = diagnosticsQuerySchema.safeParse(Object.fromEntries(searchParams));

    if (!parsed.success) {
      return jsonValidationError(parsed.error);
    }

    const connection = await prisma.whatsAppConnection.findFirst({
      where: {
        userId: user.id,
        ...(parsed.data.connectionId ? { id: parsed.data.connectionId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    if (!connection) {
      return jsonSuccess({
        connected: false,
        checks: [
          createCheck("connection", "WhatsApp connection", "failed", "No WhatsApp number is connected to this account yet."),
        ],
      });
    }

    const webhookUrl = `${appEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/api/webhooks/whatsapp`;
    const checks: DiagnosticCheck[] = [
      createCheck(
        "connection",
        "Saved connection",
        connection.isActive && connection.isVerified ? "passed" : "warning",
        connection.isActive && connection.isVerified
          ? "This number is saved and marked active in kallem."
          : "This number is saved, but it is not fully active yet.",
      ),
      createCheck(
        "environment",
        "Production mode",
        appEnv.WHATSAPP_MOCK_MODE ? "warning" : "passed",
        appEnv.WHATSAPP_MOCK_MODE
          ? "Mock mode is enabled, so real WhatsApp sends are disabled."
          : "Mock mode is off. kallem will call the real WhatsApp Cloud API.",
      ),
      createCheck("webhook-url", "Webhook URL", "passed", webhookUrl),
    ];

    if (appEnv.WHATSAPP_MOCK_MODE) {
      return jsonSuccess({
        connected: true,
        mode: "mock",
        connection: sanitizeConnection(connection),
        checks,
      });
    }

    const accessToken = decrypt(connection.accessToken);
    const phoneProfile = await getPhoneProfile(connection.phoneNumberId, accessToken);

    checks.push(
      createCheck(
        "phone-profile",
        "Phone number verified",
        "passed",
        phoneProfile.display_phone_number
          ? `Meta returned ${phoneProfile.display_phone_number}${phoneProfile.verified_name ? ` (${phoneProfile.verified_name})` : ""}.`
          : "Meta confirmed this Phone Number ID.",
      ),
    );

    const businessPhone = await getBusinessAccountPhoneNumber(connection.businessAccountId, connection.phoneNumberId, accessToken);

    if (!businessPhone) {
      checks.push(
        createCheck(
          "business-account",
          "Business account ownership",
          "failed",
          "This Phone Number ID was not found inside the saved WhatsApp Business Account ID.",
        ),
      );

      return jsonSuccess({
        connected: true,
        mode: "live",
        connection: sanitizeConnection(connection),
        checks,
      });
    }

    checks.push(
      createCheck(
        "business-account",
        "Business account ownership",
        "passed",
        "The saved WhatsApp Business Account owns this phone number.",
      ),
    );

    await subscribeAppToBusinessAccount(connection.businessAccountId, accessToken);
    checks.push(
      createCheck(
        "webhook-subscription",
        "Webhook subscription",
        "passed",
        "Meta accepted the app subscription for this WhatsApp Business Account.",
      ),
    );

    return jsonSuccess({
      connected: true,
      mode: "live",
      connection: sanitizeConnection(connection),
      checks,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(error.message, 401);
    }

    if (error instanceof EmbeddedSignupError) {
      logger.warn("api.whatsapp.diagnostics", "Meta rejected WhatsApp diagnostics.", {
        status: error.status,
        response: error.response,
      });

      return jsonSuccess({
        connected: true,
        mode: appEnv.WHATSAPP_MOCK_MODE ? "mock" : "live",
        checks: [
          createCheck(
            "meta-api",
            "Meta API check",
            "failed",
            "Meta rejected the saved credentials. Reconnect the number with a fresh token that has WhatsApp management and messaging permissions.",
          ),
        ],
      });
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.whatsapp.diagnostics", error);

    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }

    logger.error("api.whatsapp.diagnostics", "WhatsApp diagnostics failed.", { error });
    return jsonError("WhatsApp diagnostics failed.", 500);
  }
}
