import { z } from "zod";

import { UnauthorizedError, requireAppUser } from "@/lib/api/auth";
import { InvalidJsonError, readJsonRequestBody } from "@/lib/api/request";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess, jsonValidationError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const productMutationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  nameEn: z.string().trim().max(120).optional().nullable(),
  description: z.string().trim().max(500).optional().nullable(),
  priceEGP: z.coerce.number().positive().max(1_000_000),
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

export async function GET() {
  try {
    const user = await requireAppUser();
    const products = await prisma.product.findMany({
      where: { userId: user.id },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return jsonSuccess({ products: products.map(serializeProduct) });
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(error.message, 401);

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.products.get", error);
    if (databaseErrorResponse) return databaseErrorResponse;

    logger.error("api.products.get", "Failed to load products.", { error });
    return jsonError("Failed to load products.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const parsed = productMutationSchema.safeParse(await readJsonRequestBody(request));

    if (!parsed.success) {
      return jsonValidationError(parsed.error);
    }

    const product = await prisma.product.create({
      data: {
        userId: user.id,
        name: parsed.data.name,
        nameEn: parsed.data.nameEn || null,
        description: parsed.data.description || null,
        price: Math.round(parsed.data.priceEGP * 100),
        category: parsed.data.category || null,
        isAvailable: parsed.data.isAvailable ?? true,
      },
    });

    return jsonSuccess({ product: serializeProduct(product) }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(error.message, 401);
    if (error instanceof InvalidJsonError) return jsonError(error.message, 400);

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.products.post", error);
    if (databaseErrorResponse) return databaseErrorResponse;

    logger.error("api.products.post", "Failed to create product.", { error });
    return jsonError("Failed to create product.", 500);
  }
}
