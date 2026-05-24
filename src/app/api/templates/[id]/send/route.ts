// FILE: src/app/api/templates/[id]/send/route.ts
import { requireAppUser, UnauthorizedError } from "@/lib/api/auth";
import {
  jsonDatabaseUnavailableIfNeeded,
  jsonError,
  jsonMethodNotAllowed,
  jsonSuccess,
  jsonValidationError,
} from "@/lib/api/response";
import { whatsappClient } from "@/lib/api/whatsapp";
import { prisma } from "@/lib/prisma/client";
import { languageCodeForTemplate, templateSendSchema } from "@/lib/templates/meta";
import { getOwnedConnectionForTemplates } from "@/lib/templates/service";
import { logger } from "@/lib/utils/logger";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import type { MessageTemplateSendResponse } from "@/types/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const user = await requireAppUser();
    const rateLimit = checkRateLimit({
      key: `template-send:${user.id}`,
      limit: 5,
      windowMs: 60_000,
      context: "api.templates.send",
    });

    if (!rateLimit.allowed) {
      return jsonError("طلبات كثيرة جداً، انتظر قليلاً.", 429, {
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      });
    }

    const parsed = templateSendSchema.safeParse(await request.json());

    if (!parsed.success) {
      return jsonValidationError(parsed.error);
    }

    const template = await prisma.messageTemplate.findFirst({
      where: { id, userId: user.id },
    });

    if (!template) {
      return jsonError("Template not found.", 404);
    }

    if (template.status !== "approved") {
      return jsonError("This template must be approved by Meta before sending.", 409);
    }

    const connection = await getOwnedConnectionForTemplates(user.id, template.connectionId ?? undefined);

    if (!connection) {
      return jsonError("Connect and verify a WhatsApp number before sending templates.", 404);
    }

    const response = await whatsappClient.sendTemplateMessage(
      connection.phoneNumberId,
      parsed.data.to,
      template.name,
      languageCodeForTemplate(template.language === "en" ? "en" : "ar"),
      parsed.data.parameters,
      { accessToken: connection.decryptedAccessToken },
    );

    return jsonSuccess<MessageTemplateSendResponse>({
      messageSent: true,
      providerMessageId: response.messages[0]?.id ?? null,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(error.message, 401);

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.templates.send", error);
    if (databaseErrorResponse) return databaseErrorResponse;

    logger.error("api.templates.send", "Failed to send template.", { error });
    return jsonError("Failed to send template.", 500);
  }
}

export async function GET() {
  return jsonMethodNotAllowed("GET");
}
