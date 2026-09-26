import { prisma } from "@/lib/prisma/client";
import { detectLeadIntent } from "@/lib/ai/leads";
import { parseOrderTag } from "@/lib/ai/order-extraction";
import { sendEmail } from "@/lib/resend/client";
import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";
import { escapeHtml } from "./utils";

export async function detectAndSaveLead(params: {
  userId: string;
  connectionId: string;
  messageId: string;
  customerPhone: string;
  messageText: string;
}) {
  const result = detectLeadIntent(params.messageText);

  if (!result.isLead || !result.interest) {
    return { created: false as const };
  }

  const existing = await prisma.lead.findFirst({
    where: {
      userId: params.userId,
      connectionId: params.connectionId,
      customerPhone: params.customerPhone,
    },
    select: { id: true },
  });

  if (existing) {
    return { created: false as const };
  }

  const lead = await prisma.lead.create({
    data: {
      userId: params.userId,
      connectionId: params.connectionId,
      messageId: params.messageId,
      customerPhone: params.customerPhone,
      interest: result.interest,
      channel: "whatsapp",
    },
  });

  return {
    created: true as const,
    lead,
    interest: result.interest,
  };
}

export async function createDetectedOrder(params: {
  userId: string;
  connectionId: string;
  customerPhone: string;
  aiReplyText: string;
  ownerEmail?: string | null;
  businessName: string | null;
}) {
  const parsedOrder = parseOrderTag(params.aiReplyText);

  if (!parsedOrder) {
    return { created: false as const };
  }

  const order = await prisma.order.create({
    data: {
      userId: params.userId,
      connectionId: params.connectionId,
      customerPhone: params.customerPhone,
      items: parsedOrder.items,
      subtotal: parsedOrder.subtotal,
      notes: parsedOrder.notes,
      status: "new",
    },
  });

  if (params.ownerEmail) {
    try {
      await sendEmail({
        to: params.ownerEmail,
        subject: "طلب جديد من واتساب",
        html: `<p>وصل طلب جديد عبر kallem.</p><p><strong>العميل:</strong> ${escapeHtml(params.customerPhone)}</p><p><strong>الإجمالي:</strong> ${(parsedOrder.subtotal / 100).toFixed(0)} جنيه</p><p><a href="${appEnv.NEXT_PUBLIC_APP_URL}/orders">افتح الطلبات</a></p>`,
      });
    } catch (error) {
      logger.warn("api.webhooks.whatsapp", "Order notification failed without blocking reply.", { error, orderId: order.id });
    }
  }

  return { created: true as const, order };
}
