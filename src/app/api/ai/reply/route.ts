// FILE: src/app/api/ai/reply/route.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Manual AI reply testing uses the same tenant settings and monthly
 * subscription limits as automatic WhatsApp replies, but never sends outbound
 * WhatsApp messages.
 */
import { z } from "zod";

import { requireAppUser, UnauthorizedError } from "@/lib/api/auth";
import { InvalidJsonError, readJsonRequestBody } from "@/lib/api/request";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess, jsonValidationError } from "@/lib/api/response";
import { getOrCreateUserSettings } from "@/lib/api/settings";
import { generateAIReply } from "@/lib/openai/client";
import { prisma } from "@/lib/prisma/client";
import { checkSubscriptionLimit, incrementReplyCount } from "@/lib/utils/subscription";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const aiReplySchema = z
  .object({
    message: z.string().trim().min(1).max(4096),
    connectionId: z.string().uuid(),
  })
  .strict();

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const body = await readJsonRequestBody(request);
    const parsed = aiReplySchema.safeParse(body);

    if (!parsed.success) {
      return jsonValidationError(parsed.error);
    }

    const connection = await prisma.whatsAppConnection.findFirst({
      where: {
        id: parsed.data.connectionId,
        userId: user.id,
      },
    });

    if (!connection) {
      return jsonError("WhatsApp connection not found.", 404);
    }

    const limit = await checkSubscriptionLimit(user.id);

    if (!limit.allowed) {
      return jsonError("Monthly AI reply limit reached.", 403, { remaining: limit.remaining });
    }

    const settings = await getOrCreateUserSettings(user.id);
    const reply = await generateAIReply({
      systemPrompt: settings.systemPrompt,
      userMessage: parsed.data.message,
      settings,
    });

    await incrementReplyCount(user.id);

    return jsonSuccess(reply);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(error.message, 401);
    }

    if (error instanceof InvalidJsonError) {
      return jsonError(error.message, 400);
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.ai.reply", error);

    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }

    logger.error("api.ai.reply", "Failed to generate manual AI reply.", { error });
    return jsonError("Failed to generate AI reply.", 500);
  }
}
