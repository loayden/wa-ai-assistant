import { MessageDirection, MessageStatus } from "@prisma/client";
import { z } from "zod";

import { UnauthorizedError, requireAppUser } from "@/lib/api/auth";
import { whatsappClient } from "@/lib/api/whatsapp";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess, jsonValidationError } from "@/lib/api/response";
import { createOrderPaymentLink } from "@/lib/paymob/order-payment";
import { prisma } from "@/lib/prisma/client";
import { decrypt } from "@/lib/utils/encryption";
import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";
import { WhatsAppClientError } from "@/lib/whatsapp/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const paramsSchema = z.object({
  id: z.string().uuid(),
});

function serializeOrderPayment(order: {
  id: string;
  paymentLink: string | null;
  paymentLinkSentAt: Date | null;
  paidAt: Date | null;
}) {
  return {
    id: order.id,
    paymentLink: order.paymentLink,
    paymentLinkSentAt: order.paymentLinkSentAt?.toISOString() ?? null,
    paidAt: order.paidAt?.toISOString() ?? null,
  };
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const user = await requireAppUser();
    const params = paramsSchema.safeParse(await context.params);

    if (!params.success) {
      return jsonValidationError(params.error);
    }

    const order = await prisma.order.findFirst({
      where: {
        id: params.data.id,
        userId: user.id,
      },
      include: {
        connection: true,
        user: {
          select: {
            email: true,
            settings: {
              select: {
                businessName: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return jsonError("Order not found.", 404);
    }

    if (!order.connection.isActive) {
      return jsonError("The WhatsApp number for this order is not active.", 400);
    }

    const payment = await createOrderPaymentLink({
      order,
      businessName: order.user.settings?.businessName ?? "kallem",
      customerEmail: order.user.email,
    });
    const messageText = `💳 لإتمام طلبك، يرجى الدفع عبر الرابط:\n${payment.url}\n\nالرابط صالح لمدة ساعة.`;
    const sendResponse = await whatsappClient.sendMessage(order.connection.phoneNumberId, order.customerPhone, messageText, {
      accessToken: appEnv.WHATSAPP_MOCK_MODE ? undefined : decrypt(order.connection.accessToken),
    });
    const outboundWaMessageId = sendResponse.messages[0]?.id;

    if (!outboundWaMessageId) {
      return jsonError("WhatsApp API did not return a message id.", 502);
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const savedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          paymentLink: payment.url,
          paymentLinkSentAt: new Date(),
        },
      });

      await tx.message.create({
        data: {
          userId: user.id,
          connectionId: order.connectionId,
          waMessageId: outboundWaMessageId,
          direction: MessageDirection.OUTBOUND,
          fromNumber: order.connection.phoneNumberId,
          toNumber: order.customerPhone,
          bodyText: messageText,
          status: MessageStatus.REPLIED,
          aiModelUsed: "order-payment-link",
          processedAt: new Date(),
        },
      });

      return savedOrder;
    });

    return jsonSuccess({
      payment: serializeOrderPayment(updatedOrder),
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(error.message, 401);

    if (error instanceof WhatsAppClientError) {
      const details = error.response?.error?.error_data?.details || error.response?.error?.message;
      return jsonError(details || "Meta rejected the payment link WhatsApp message.", 502);
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.orders.paymentLink", error);
    if (databaseErrorResponse) return databaseErrorResponse;

    logger.error("api.orders.paymentLink", "Failed to send order payment link.", { error });
    return jsonError("Failed to send order payment link.", 500);
  }
}
