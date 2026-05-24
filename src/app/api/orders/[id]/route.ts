import { MessageDirection, MessageStatus } from "@prisma/client";
import { z } from "zod";

import { UnauthorizedError, requireAppUser } from "@/lib/api/auth";
import { InvalidJsonError, readJsonRequestBody } from "@/lib/api/request";
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

const orderPatchSchema = z
  .object({
    status: z.enum(["new", "confirmed", "preparing", "delivered", "cancelled"]).optional(),
    customerAddress: z.string().trim().max(500).optional().nullable(),
    notes: z.string().trim().max(800).optional().nullable(),
  })
  .strict();

const STATUS_MESSAGES: Partial<Record<string, string>> = {
  confirmed: "✅ تم تأكيد طلبك! سنبدأ التحضير الآن.",
  preparing: "🚀 طلبك في الطريق إليك!",
  delivered: "🎉 نتمنى أن تكون استمتعت بطلبك! قيّمنا ⭐",
};

function serializeOrder(order: {
  id: string;
  customerPhone: string;
  customerName: string | null;
  customerAddress: string | null;
  items: unknown;
  subtotal: number;
  status: string;
  notes: string | null;
  paymentLink: string | null;
  paymentLinkSentAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...order,
    subtotalEGP: order.subtotal / 100,
    paymentLinkSentAt: order.paymentLinkSentAt?.toISOString() ?? null,
    paidAt: order.paidAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

async function sendOrderWhatsAppMessage(params: {
  userId: string;
  connectionId: string;
  phoneNumberId: string;
  encryptedAccessToken: string;
  to: string;
  message: string;
  modelUsed: string;
}) {
  const sendResponse = await whatsappClient.sendMessage(params.phoneNumberId, params.to, params.message, {
    accessToken: appEnv.WHATSAPP_MOCK_MODE ? undefined : decrypt(params.encryptedAccessToken),
  });
  const outboundWaMessageId = sendResponse.messages[0]?.id;

  if (!outboundWaMessageId) {
    throw new Error("WhatsApp API did not return a message id.");
  }

  await prisma.message.create({
    data: {
      userId: params.userId,
      connectionId: params.connectionId,
      waMessageId: outboundWaMessageId,
      direction: MessageDirection.OUTBOUND,
      fromNumber: params.phoneNumberId,
      toNumber: params.to,
      bodyText: params.message,
      status: MessageStatus.REPLIED,
      aiModelUsed: params.modelUsed,
      processedAt: new Date(),
    },
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireAppUser();
    const params = paramsSchema.safeParse(await context.params);

    if (!params.success) {
      return jsonValidationError(params.error);
    }

    const parsed = orderPatchSchema.safeParse(await readJsonRequestBody(request));

    if (!parsed.success) {
      return jsonValidationError(parsed.error);
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

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: parsed.data.status,
        customerAddress: parsed.data.customerAddress === undefined ? undefined : parsed.data.customerAddress || null,
        notes: parsed.data.notes === undefined ? undefined : parsed.data.notes || null,
      },
    });
    const warnings: string[] = [];

    if (parsed.data.status && parsed.data.status !== order.status && order.connection.isActive) {
      const statusMessage = STATUS_MESSAGES[parsed.data.status];

      if (statusMessage) {
        try {
          await sendOrderWhatsAppMessage({
            userId: user.id,
            connectionId: order.connectionId,
            phoneNumberId: order.connection.phoneNumberId,
            encryptedAccessToken: order.connection.accessToken,
            to: order.customerPhone,
            message: statusMessage,
            modelUsed: `order-status-${parsed.data.status}`,
          });
        } catch (sendError) {
          logger.warn("api.orders.patch", "Order status WhatsApp update failed without reverting order status.", {
            error: sendError,
            orderId: order.id,
          });
          warnings.push("Order status was saved, but the WhatsApp update did not send.");
        }
      }

      if (parsed.data.status === "confirmed" && !order.paymentLink) {
        try {
          const payment = await createOrderPaymentLink({
            order,
            businessName: order.user.settings?.businessName ?? "kallem",
            customerEmail: order.user.email,
          });
          const paymentText = `💳 لإتمام طلبك، يرجى الدفع عبر الرابط:\n${payment.url}\n\nالرابط صالح لمدة ساعة.`;

          await sendOrderWhatsAppMessage({
            userId: user.id,
            connectionId: order.connectionId,
            phoneNumberId: order.connection.phoneNumberId,
            encryptedAccessToken: order.connection.accessToken,
            to: order.customerPhone,
            message: paymentText,
            modelUsed: "order-payment-link",
          });

          await prisma.order.update({
            where: { id: order.id },
            data: {
              paymentLink: payment.url,
              paymentLinkSentAt: new Date(),
            },
          });
        } catch (paymentError) {
          logger.warn("api.orders.patch", "Order payment link creation failed without reverting order status.", {
            error: paymentError,
            orderId: order.id,
          });
          warnings.push("Order status was saved, but the payment link did not send.");
        }
      }
    }

    const refreshedOrder = await prisma.order.findUniqueOrThrow({
      where: { id: updatedOrder.id },
    });

    return jsonSuccess({
      order: serializeOrder(refreshedOrder),
      warnings,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(error.message, 401);
    if (error instanceof InvalidJsonError) return jsonError(error.message, 400);

    if (error instanceof WhatsAppClientError) {
      const details = error.response?.error?.error_data?.details || error.response?.error?.message;
      return jsonError(details || "Meta rejected this WhatsApp order update.", 502);
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.orders.patch", error);
    if (databaseErrorResponse) return databaseErrorResponse;

    logger.error("api.orders.patch", "Failed to update order.", { error });
    return jsonError("Failed to update order.", 500);
  }
}
