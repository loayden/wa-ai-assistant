import "server-only";

import { prisma } from "@/lib/prisma/client";
import { sendEmail } from "@/lib/resend/client";
import { logger } from "@/lib/utils/logger";
import type { NotificationEvent } from "@/lib/notifications/preferences";

export async function sendConversationNotificationOnce(params: {
  userId: string;
  ownerEmail: string;
  connectionId: string;
  customerPhone: string;
  event: Exclude<NotificationEvent, "daily_summary" | "weekly_report">;
  subject: string;
  html: string;
}) {
  const existing = await prisma.conversationHandoff.findUnique({
    where: {
      userId_connectionId_customerPhone: {
        userId: params.userId,
        connectionId: params.connectionId,
        customerPhone: params.customerPhone,
      },
    },
    select: {
      notifiedEvents: true,
    },
  });
  const currentEvents = existing?.notifiedEvents ?? [];

  if (currentEvents.includes(params.event)) {
    return { sent: false, reason: "duplicate" as const };
  }

  try {
    await sendEmail({
      to: params.ownerEmail,
      subject: params.subject,
      html: params.html,
    });
  } catch (error) {
    logger.warn("notifications.sendConversationNotificationOnce", "Notification email failed without blocking workflow.", {
      error,
      event: params.event,
      userId: params.userId,
    });
    return { sent: false, reason: "email_failed" as const };
  }

  const notifiedEvents = Array.from(new Set([...currentEvents, params.event]));

  await prisma.conversationHandoff.upsert({
    where: {
      userId_connectionId_customerPhone: {
        userId: params.userId,
        connectionId: params.connectionId,
        customerPhone: params.customerPhone,
      },
    },
    create: {
      userId: params.userId,
      connectionId: params.connectionId,
      customerPhone: params.customerPhone,
      active: false,
      notifiedEvents,
    },
    update: {
      notifiedEvents,
    },
  });

  return { sent: true as const };
}
