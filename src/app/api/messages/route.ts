// FILE: src/app/api/messages/route.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Message reads are paginated and always scoped by authenticated user
 * id so tenants cannot query each other's conversation history.
 */
import { MessageDirection, MessageStatus, Prisma } from "@prisma/client";
import { z } from "zod";

import { requireAppUser, UnauthorizedError } from "@/lib/api/auth";
import {
  jsonDatabaseUnavailableIfNeeded,
  jsonError,
  jsonMethodNotAllowed,
  jsonSuccess,
  jsonValidationError,
} from "@/lib/api/response";
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const messagesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  direction: z.nativeEnum(MessageDirection).optional(),
  status: z.nativeEnum(MessageStatus).optional(),
  connectionId: z.string().uuid().optional(),
});

const messageListSelect = {
  id: true,
  userId: true,
  connectionId: true,
  waMessageId: true,
  direction: true,
  fromNumber: true,
  toNumber: true,
  bodyText: true,
  mediaUrl: true,
  mediaType: true,
  status: true,
  aiReplyText: true,
  aiModelUsed: true,
  aiTokensUsed: true,
  processedAt: true,
  createdAt: true,
  updatedAt: true,
  connection: {
    select: {
      id: true,
      displayName: true,
      phoneNumberId: true,
    },
  },
} as const;

export async function GET(request: Request) {
  try {
    const user = await requireAppUser();
    const { searchParams } = new URL(request.url);
    const parsed = messagesQuerySchema.safeParse(Object.fromEntries(searchParams));

    if (!parsed.success) {
      return jsonValidationError(parsed.error);
    }

    const where: Prisma.MessageWhereInput = {
      userId: user.id,
      connectionId: parsed.data.connectionId,
      direction: parsed.data.direction,
      status: parsed.data.status,
    };
    const skip = (parsed.data.page - 1) * parsed.data.limit;

    const [messages, total] = await prisma.$transaction([
      prisma.message.findMany({
        where,
        skip,
        take: parsed.data.limit,
        orderBy: { createdAt: "desc" },
        select: messageListSelect,
      }),
      prisma.message.count({ where }),
    ]);

    const handoffPairs = messages.map((message) => ({
      connectionId: message.connectionId,
      customerPhone: message.direction === MessageDirection.OUTBOUND ? message.toNumber : message.fromNumber,
    }));
    const handoffs =
      handoffPairs.length > 0
        ? await prisma.conversationHandoff.findMany({
            where: {
              userId: user.id,
              OR: handoffPairs,
            },
            select: {
              connectionId: true,
              customerPhone: true,
              active: true,
              handoffAt: true,
              resolvedAt: true,
              rating: true,
              ratingRequestedAt: true,
            },
          })
        : [];
    const handoffMap = new Map(
      handoffs.map((handoff) => [
        `${handoff.connectionId}:${handoff.customerPhone}`,
        {
          active: handoff.active,
          handoffAt: handoff.handoffAt?.toISOString() ?? null,
          resolvedAt: handoff.resolvedAt?.toISOString() ?? null,
          rating: handoff.rating,
          ratingRequestedAt: handoff.ratingRequestedAt?.toISOString() ?? null,
        },
      ]),
    );
    const messagesWithHandoff = messages.map((message) => {
      const customerPhone = message.direction === MessageDirection.OUTBOUND ? message.toNumber : message.fromNumber;
      const handoff = handoffMap.get(`${message.connectionId}:${customerPhone}`);

      return {
        ...message,
        metadata: {},
        handoffActive: Boolean(handoff?.active),
        handoffAt: handoff?.handoffAt ?? null,
        resolvedAt: handoff?.resolvedAt ?? null,
        rating: handoff?.rating ?? null,
        ratingRequestedAt: handoff?.ratingRequestedAt ?? null,
      };
    });

    return jsonSuccess(messagesWithHandoff, {
      meta: {
        total,
        page: parsed.data.page,
        limit: parsed.data.limit,
      },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(error.message, 401);
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.messages.get", error);

    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }

    logger.error("api.messages.get", "Failed to load messages.", { error });
    return jsonError("Failed to load messages.", 500);
  }
}

export async function POST() {
  return jsonMethodNotAllowed("POST");
}
