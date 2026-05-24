import "server-only";

import type { SupportTicket, TicketMessage, User } from "@prisma/client";

export const TICKET_CATEGORIES = ["technical", "billing", "feature_request", "other"] as const;
export const TICKET_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export const TICKET_STATUSES = ["open", "in_progress", "waiting_customer", "resolved", "closed"] as const;

export type TicketCategory = (typeof TICKET_CATEGORIES)[number];
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export function serializeTicket(
  ticket: SupportTicket & {
    user?: Pick<User, "id" | "email" | "fullName" | "planTier"> | null;
    messages?: TicketMessage[];
    _count?: { messages: number };
  },
) {
  return {
    id: ticket.id,
    userId: ticket.userId,
    subject: ticket.subject,
    category: ticket.category as TicketCategory,
    priority: ticket.priority as TicketPriority,
    status: ticket.status as TicketStatus,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
    user: ticket.user
      ? {
          id: ticket.user.id,
          email: ticket.user.email,
          fullName: ticket.user.fullName,
          planTier: ticket.user.planTier,
        }
      : undefined,
    messages: ticket.messages?.map(serializeTicketMessage),
    messageCount: ticket._count?.messages ?? ticket.messages?.length ?? 0,
  };
}

export function serializeTicketMessage(message: TicketMessage) {
  return {
    id: message.id,
    ticketId: message.ticketId,
    sender: message.sender as "customer" | "admin",
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  };
}

export function isTicketStatus(value: string): value is TicketStatus {
  return (TICKET_STATUSES as readonly string[]).includes(value);
}

export function isTicketPriority(value: string): value is TicketPriority {
  return (TICKET_PRIORITIES as readonly string[]).includes(value);
}
