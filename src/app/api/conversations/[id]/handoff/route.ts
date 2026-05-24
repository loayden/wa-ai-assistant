import { UnauthorizedError, requireAppUser } from "@/lib/api/auth";
import { resolveConversationThread } from "@/lib/api/conversations";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess, jsonValidationError } from "@/lib/api/response";
import { getOrCreateUserSettings } from "@/lib/api/settings";
import { shouldSendNotification } from "@/lib/notifications/preferences";
import { sendConversationNotificationOnce } from "@/lib/notifications/events";
import { prisma } from "@/lib/prisma/client";
import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";
import { conversationParamsSchema } from "@/lib/validators/conversations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const user = await requireAppUser();
    const params = conversationParamsSchema.safeParse(await context.params);

    if (!params.success) {
      return jsonValidationError(params.error);
    }

    const thread = await resolveConversationThread(user.id, params.data.id);

    if (!thread) {
      return jsonError("Conversation not found.", 404);
    }

    const now = new Date();
    const handoff = await prisma.conversationHandoff.upsert({
      where: {
        userId_connectionId_customerPhone: {
          userId: user.id,
          connectionId: thread.connection.id,
          customerPhone: thread.customerPhone,
        },
      },
      create: {
        userId: user.id,
        connectionId: thread.connection.id,
        customerPhone: thread.customerPhone,
        active: true,
        handoffAt: now,
        resumedAt: null,
      },
      update: {
        active: true,
        handoffAt: now,
        resumedAt: null,
      },
    });

    const settings = await getOrCreateUserSettings(user.id);

    if (user.email && shouldSendNotification(settings.notificationPrefs, "handoff")) {
      await sendConversationNotificationOnce({
        userId: user.id,
        ownerEmail: user.email,
        connectionId: thread.connection.id,
        customerPhone: thread.customerPhone,
        event: "handoff",
        subject: "محادثة تحتاج تدخلك",
        html: `<p>تم تحويل محادثة إلى الرد اليدوي.</p><p><strong>العميل:</strong> ${thread.customerPhone}</p><p><a href="${appEnv.NEXT_PUBLIC_APP_URL}/messages">افتح صندوق الرسائل</a></p>`,
      });
    }

    return jsonSuccess({
      handoff: {
        id: handoff.id,
        active: handoff.active,
        handoffAt: handoff.handoffAt?.toISOString() ?? null,
        resumedAt: handoff.resumedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(error.message, 401);
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.conversations.handoff", error);

    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }

    logger.error("api.conversations.handoff", "Failed to activate handoff.", { error });
    return jsonError("Failed to activate handoff.", 500);
  }
}
