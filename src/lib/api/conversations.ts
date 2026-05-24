import { MessageDirection } from "@prisma/client";

import { prisma } from "@/lib/prisma/client";

export type ConversationThreadRef = Awaited<ReturnType<typeof resolveConversationThread>>;

export async function resolveConversationThread(userId: string, messageId: string) {
  const message = await prisma.message.findFirst({
    where: {
      id: messageId,
      userId,
    },
    select: {
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
      connection: true,
    },
  });

  if (!message) {
    return null;
  }

  const customerPhone = message.direction === MessageDirection.OUTBOUND ? message.toNumber : message.fromNumber;

  return {
    message,
    connection: message.connection,
    customerPhone,
  };
}
