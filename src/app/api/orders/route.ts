import { z } from "zod";

import { UnauthorizedError, requireAppUser } from "@/lib/api/auth";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess, jsonValidationError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ordersQuerySchema = z.object({
  status: z.enum(["new", "confirmed", "preparing", "delivered", "cancelled"]).optional(),
});

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

export async function GET(request: Request) {
  try {
    const user = await requireAppUser();
    const { searchParams } = new URL(request.url);
    const parsed = ordersQuerySchema.safeParse(Object.fromEntries(searchParams));

    if (!parsed.success) {
      return jsonValidationError(parsed.error);
    }

    const orders = await prisma.order.findMany({
      where: {
        userId: user.id,
        status: parsed.data.status,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return jsonSuccess({ orders: orders.map(serializeOrder) });
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(error.message, 401);

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.orders.get", error);
    if (databaseErrorResponse) return databaseErrorResponse;

    logger.error("api.orders.get", "Failed to load orders.", { error });
    return jsonError("Failed to load orders.", 500);
  }
}
