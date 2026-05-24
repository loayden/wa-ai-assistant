import { UnauthorizedError, requireAppUser } from "@/lib/api/auth";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess } from "@/lib/api/response";
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serializeCorrection(correction: {
  id: string;
  originalCustomerMessage: string;
  wrongAiReply: string;
  correctReply: string;
  createdAt: Date;
}) {
  return {
    ...correction,
    createdAt: correction.createdAt.toISOString(),
  };
}

export async function GET() {
  try {
    const user = await requireAppUser();
    const corrections = await prisma.aiCorrection.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return jsonSuccess({ corrections: corrections.map(serializeCorrection) });
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(error.message, 401);

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.corrections.get", error);
    if (databaseErrorResponse) return databaseErrorResponse;

    logger.error("api.corrections.get", "Failed to load AI corrections.", { error });
    return jsonError("Failed to load AI corrections.", 500);
  }
}
