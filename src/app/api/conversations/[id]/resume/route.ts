import { UnauthorizedError, requireAppUser } from "@/lib/api/auth";
import { resolveConversationThread } from "@/lib/api/conversations";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess, jsonValidationError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma/client";
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

    await prisma.conversationHandoff.updateMany({
      where: {
        userId: user.id,
        connectionId: thread.connection.id,
        customerPhone: thread.customerPhone,
      },
      data: {
        active: false,
        resumedAt: new Date(),
      },
    });

    return jsonSuccess({
      handoff: {
        active: false,
      },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(error.message, 401);
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.conversations.resume", error);

    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }

    logger.error("api.conversations.resume", "Failed to resume assistant.", { error });
    return jsonError("Failed to resume assistant.", 500);
  }
}
