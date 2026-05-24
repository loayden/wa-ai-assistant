import { z } from "zod";

import { UnauthorizedError, requireAppUser } from "@/lib/api/auth";
import { InvalidJsonError, readJsonRequestBody } from "@/lib/api/request";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess, jsonValidationError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma/client";
import { getAdminEmail, sendSupportEmail } from "@/lib/support/email";
import { serializeTicketMessage } from "@/lib/support/tickets";
import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createMessageSchema = z.object({
  content: z.string().trim().min(1).max(3000),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const user = await requireAppUser();
    const parsed = createMessageSchema.safeParse(await readJsonRequestBody(request));

    if (!parsed.success) {
      return jsonValidationError(parsed.error);
    }

    const ticket = await prisma.supportTicket.findFirst({
      where: user.isAdmin ? { id } : { id, userId: user.id },
      include: {
        user: {
          select: {
            email: true,
            fullName: true,
          },
        },
      },
    });

    if (!ticket) {
      return jsonError("Ticket not found.", 404);
    }

    if (ticket.status === "resolved" || ticket.status === "closed") {
      return jsonError("This ticket is closed.", 409);
    }

    const sender = user.isAdmin ? "admin" : "customer";
    const message = await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        sender,
        content: parsed.data.content,
      },
    });

    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: user.isAdmin ? "waiting_customer" : "open",
        updatedAt: new Date(),
      },
      select: { id: true },
    });

    if (user.isAdmin) {
      await sendSupportEmail({
        to: ticket.user.email,
        subject: `💬 رد جديد على تذكرتك — ${ticket.subject}`,
        html: `<div dir="rtl" style="font-family:Arial,sans-serif">
          <p>تم الرد على تذكرتك في كَلّم.</p>
          <p><strong>الرد:</strong></p>
          <p>${parsed.data.content}</p>
          <p><a href="${appEnv.NEXT_PUBLIC_APP_URL}/support">عرض الرد</a></p>
        </div>`,
      });
    } else {
      await sendSupportEmail({
        to: getAdminEmail(),
        subject: `💬 رد عميل على تذكرة — ${ticket.subject}`,
        html: `<div dir="rtl" style="font-family:Arial,sans-serif">
          <p><strong>النشاط:</strong> ${ticket.user.fullName ?? ticket.user.email}</p>
          <p><strong>الرد:</strong></p>
          <p>${parsed.data.content}</p>
          <p><a href="${appEnv.NEXT_PUBLIC_APP_URL}/admin/tickets/${ticket.id}">فتح التذكرة</a></p>
        </div>`,
      });
    }

    return jsonSuccess({ message: serializeTicketMessage(message) }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(error.message, 401);
    if (error instanceof InvalidJsonError) return jsonError(error.message, 400);

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.tickets.messages.post", error);
    if (databaseErrorResponse) return databaseErrorResponse;

    logger.error("api.tickets.messages.post", "Failed to add ticket message.", { error, ticketId: id });
    return jsonError("Failed to add ticket message.", 500);
  }
}
