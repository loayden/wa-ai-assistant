import { z } from "zod";

import { UnauthorizedError, requireAppUser } from "@/lib/api/auth";
import { InvalidJsonError, readJsonRequestBody } from "@/lib/api/request";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess, jsonValidationError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma/client";
import { getAdminEmail, sendSupportEmail } from "@/lib/support/email";
import { serializeTicket, TICKET_CATEGORIES } from "@/lib/support/tickets";
import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createTicketSchema = z.object({
  subject: z.string().trim().min(3).max(160),
  category: z.enum(TICKET_CATEGORIES),
  firstMessage: z.string().trim().min(5).max(3000),
});

export async function GET() {
  try {
    const user = await requireAppUser();
    const tickets = await prisma.supportTicket.findMany({
      where: user.isAdmin ? {} : { userId: user.id },
      orderBy: { updatedAt: "desc" },
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
          take: 1,
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    return jsonSuccess({ tickets: tickets.map(serializeTicket) });
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(error.message, 401);

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.tickets.get", error);
    if (databaseErrorResponse) return databaseErrorResponse;

    logger.error("api.tickets.get", "Failed to load support tickets.", { error });
    return jsonError("Failed to load support tickets.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const parsed = createTicketSchema.safeParse(await readJsonRequestBody(request));

    if (!parsed.success) {
      return jsonValidationError(parsed.error);
    }

    const ticket = await prisma.$transaction(async (tx) => {
      const createdTicket = await tx.supportTicket.create({
        data: {
          userId: user.id,
          subject: parsed.data.subject,
          category: parsed.data.category,
          messages: {
            create: {
              sender: "customer",
              content: parsed.data.firstMessage,
            },
          },
        },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      return createdTicket;
    });

    await sendSupportEmail({
      to: getAdminEmail(),
      subject: `🎫 تذكرة جديدة — ${parsed.data.category} — ${user.fullName ?? user.email}`,
      html: `<div dir="rtl" style="font-family:Arial,sans-serif">
        <p><strong>النشاط:</strong> ${user.fullName ?? user.email}</p>
        <p><strong>الموضوع:</strong> ${parsed.data.subject}</p>
        <p><strong>الرسالة:</strong></p>
        <p>${parsed.data.firstMessage}</p>
        <p><a href="${appEnv.NEXT_PUBLIC_APP_URL}/admin/tickets/${ticket.id}">فتح التذكرة</a></p>
      </div>`,
    });

    return jsonSuccess({ ticket: serializeTicket(ticket) }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(error.message, 401);
    if (error instanceof InvalidJsonError) return jsonError(error.message, 400);

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.tickets.post", error);
    if (databaseErrorResponse) return databaseErrorResponse;

    logger.error("api.tickets.post", "Failed to create support ticket.", { error });
    return jsonError("Failed to create support ticket.", 500);
  }
}
