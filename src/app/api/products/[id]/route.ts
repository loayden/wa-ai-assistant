import { z } from "zod";

import { UnauthorizedError, requireAppUser } from "@/lib/api/auth";
import { InvalidJsonError, readJsonRequestBody } from "@/lib/api/request";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess, jsonValidationError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/utils/logger";

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

const productPatchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  nameEn: z.string().trim().max(120).optional().nullable(),
  description: z.string().trim().max(500).optional().nullable(),
  priceEGP: z.coerce.number().positive().max(1_000_000).optional(),
  category: z.string().trim().max(80).optional().nullable(),
  isAvailable: z.boolean().optional(),
});

function serializeProduct(product: {
  id: string;
  name: string;
  nameEn: string | null;
  description: string | null;
  price: number;
  category: string | null;
  isAvailable: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...product,
    priceEGP: product.price / 100,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireAppUser();
    const params = paramsSchema.safeParse(await context.params);

    if (!params.success) {
      return jsonValidationError(params.error);
    }

    const parsed = productPatchSchema.safeParse(await readJsonRequestBody(request));

    if (!parsed.success) {
      return jsonValidationError(parsed.error);
    }

    const existingProduct = await prisma.product.findFirst({
      where: {
        id: params.data.id,
        userId: user.id,
      },
      select: {
        id: true,
      },
    });

    if (!existingProduct) {
      return jsonError("Product not found.", 404);
    }

    const product = await prisma.product.update({
      where: {
        id: existingProduct.id,
      },
      data: {
        name: parsed.data.name,
        nameEn: parsed.data.nameEn === undefined ? undefined : parsed.data.nameEn || null,
        description: parsed.data.description === undefined ? undefined : parsed.data.description || null,
        price: parsed.data.priceEGP === undefined ? undefined : Math.round(parsed.data.priceEGP * 100),
        category: parsed.data.category === undefined ? undefined : parsed.data.category || null,
        isAvailable: parsed.data.isAvailable,
      },
    });

    return jsonSuccess({ product: serializeProduct(product) });
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(error.message, 401);
    if (error instanceof InvalidJsonError) return jsonError(error.message, 400);

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.products.patch", error);
    if (databaseErrorResponse) return databaseErrorResponse;

    logger.error("api.products.patch", "Failed to update product.", { error });
    return jsonError("Failed to update product.", 500);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await requireAppUser();
    const params = paramsSchema.safeParse(await context.params);

    if (!params.success) {
      return jsonValidationError(params.error);
    }

    const existingProduct = await prisma.product.findFirst({
      where: {
        id: params.data.id,
        userId: user.id,
      },
      select: {
        id: true,
      },
    });

    if (!existingProduct) {
      return jsonError("Product not found.", 404);
    }

    await prisma.product.delete({
      where: {
        id: existingProduct.id,
      },
    });

    return jsonSuccess({ deleted: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(error.message, 401);

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.products.delete", error);
    if (databaseErrorResponse) return databaseErrorResponse;

    logger.error("api.products.delete", "Failed to delete product.", { error });
    return jsonError("Failed to delete product.", 500);
  }
}
