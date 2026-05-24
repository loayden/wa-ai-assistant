import { z } from "zod";

import { ForbiddenError, UnauthorizedError, requireAppUser } from "@/lib/api/auth";
import { InvalidJsonError, readJsonRequestBody } from "@/lib/api/request";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess, jsonValidationError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma/client";
import { isTicketPriority, isTicketStatus, serializeTicket, TICKET_PRIORITIES, TICKET_STATUSES } from "@/lib/support/tickets";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateTicketSchema = z.object({
  status: z.enum(TICKET_STATUSES).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
});

async function getAccessibleTicket(ticketId: string, user: { id: string; isAdmin: boolean }) {
  return prisma.supportTicket.findFirst({
    where: user.isAdmin ? { id: ticketId } : { id: ticketId, userId: user.id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          planTier: true,
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const user = await requireAppUser();
    const ticket = await getAccessibleTicket(id, user);

    if (!ticket) {
      return jsonError("Ticket not found.", 404);
    }

    return jsonSuccess({ ticket: serializeTicket(ticket) });
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(error.message, 401);

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.tickets.id.get", error);
    if (databaseErrorResponse) return databaseErrorResponse;

    logger.error("api.tickets.id.get", "Failed to load ticket.", { error, ticketId: id });
    return jsonError("Failed to load ticket.", 500);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const user = await requireAppUser();
    const parsed = updateTicketSchema.safeParse(await readJsonRequestBody(request));

    if (!parsed.success) {
      return jsonValidationError(parsed.error);
    }

    if (parsed.data.priority !== undefined && !user.isAdmin) {
      throw new ForbiddenError("Only admins can change ticket priority.");
    }

    const ticket = await getAccessibleTicket(id, user);

    if (!ticket) {
      return jsonError("Ticket not found.", 404);
    }

    const nextStatus = parsed.data.status;
    const nextPriority = parsed.data.priority;

    if (nextStatus && !isTicketStatus(nextStatus)) {
      return jsonError("Invalid ticket status.", 422);
    }

    if (nextPriority && !isTicketPriority(nextPriority)) {
      return jsonError("Invalid ticket priority.", 422);
    }

    const updatedTicket = await prisma.supportTicket.update({
      where: { id },
      data: {
        ...(nextStatus ? { status: nextStatus, resolvedAt: nextStatus === "resolved" ? new Date() : null } : {}),
        ...(nextPriority ? { priority: nextPriority } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            planTier: true,
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return jsonSuccess({ ticket: serializeTicket(updatedTicket) });
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(error.message, 401);
    if (error instanceof ForbiddenError) return jsonError(error.message, 403);
    if (error instanceof InvalidJsonError) return jsonError(error.message, 400);

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.tickets.id.patch", error);
    if (databaseErrorResponse) return databaseErrorResponse;

    logger.error("api.tickets.id.patch", "Failed to update ticket.", { error, ticketId: id });
    return jsonError("Failed to update ticket.", 500);
  }
}
