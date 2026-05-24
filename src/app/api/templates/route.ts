// FILE: src/app/api/templates/route.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Template creation is tenant-scoped, validates the saved WhatsApp
 * connection, and only then submits the exact payload to Meta.
 */
import { Prisma } from "@prisma/client";

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
import {
  buildMetaTemplateComponents,
  languageCodeForTemplate,
  normalizeMetaTemplateStatus,
  templateMutationSchema,
} from "@/lib/templates/meta";
import { getOwnedConnectionForTemplates, serializeTemplate } from "@/lib/templates/service";
import { logger } from "@/lib/utils/logger";
import type { MessageTemplateMutationResponse, MessageTemplatesResponse } from "@/types/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireAppUser();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? undefined;

    const templates = await prisma.messageTemplate.findMany({
      where: {
        userId: user.id,
        status,
      },
      orderBy: { createdAt: "desc" },
    });

    return jsonSuccess<MessageTemplatesResponse>({ templates: templates.map(serializeTemplate) });
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(error.message, 401);

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.templates.get", error);
    if (databaseErrorResponse) return databaseErrorResponse;

    logger.error("api.templates.get", "Failed to load templates.", { error });
    return jsonError("Failed to load templates.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const body = await request.json();
    const parsed = templateMutationSchema.safeParse(body);

    if (!parsed.success) {
      return jsonValidationError(parsed.error);
    }

    const connection = await getOwnedConnectionForTemplates(user.id, parsed.data.connectionId);

    if (!connection) {
      return jsonError("Connect and verify a WhatsApp number before creating templates.", 404);
    }

    const components = buildMetaTemplateComponents({
      headerText: parsed.data.headerText || null,
      bodyText: parsed.data.bodyText,
      footerText: parsed.data.footerText || null,
      buttonText: parsed.data.buttonText || null,
      buttonUrl: parsed.data.buttonUrl || null,
    });

    const metaResponse = await whatsappClient.submitTemplate(
      connection.businessAccountId,
      {
        name: parsed.data.name,
        language: languageCodeForTemplate(parsed.data.language),
        category: parsed.data.category,
        components,
      },
      { accessToken: connection.decryptedAccessToken },
    );

    const template = await prisma.messageTemplate.create({
      data: {
        userId: user.id,
        connectionId: connection.id,
        name: parsed.data.name,
        displayName: parsed.data.displayName,
        category: parsed.data.category,
        language: parsed.data.language,
        headerText: parsed.data.headerText || null,
        bodyText: parsed.data.bodyText,
        footerText: parsed.data.footerText || null,
        buttonText: parsed.data.buttonText || null,
        buttonUrl: parsed.data.buttonUrl || null,
        metaTemplateId: metaResponse.id ?? null,
        status: normalizeMetaTemplateStatus(metaResponse.status),
      },
    });

    return jsonSuccess<MessageTemplateMutationResponse>({ template: serializeTemplate(template) }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(error.message, 401);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError("A template with this internal name already exists.", 409);
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.templates.post", error);
    if (databaseErrorResponse) return databaseErrorResponse;

    logger.error("api.templates.post", "Failed to create template.", { error });
    return jsonError("Failed to create template.", 500);
  }
}

export async function PATCH() {
  return jsonMethodNotAllowed("PATCH");
}
