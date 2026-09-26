import { UnauthorizedError, requireAppUser } from "@/lib/api/auth";
import { InvalidJsonError, readJsonRequestBody } from "@/lib/api/request";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess, jsonValidationError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/utils/logger";
import { TEAM_ROLES } from "@/app/api/team/route";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateTeamMemberSchema = z.object({
  role: z.enum(TEAM_ROLES),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAppUser();
    const { id } = await params;
    const parsed = updateTeamMemberSchema.safeParse(await readJsonRequestBody(request));

    if (!parsed.success) {
      return jsonValidationError(parsed.error);
    }

    const member = await prisma.teamMember.findFirst({
      where: { id, userId: user.id },
    });

    if (!member) {
      return jsonError("العضو غير موجود.", 404);
    }

    const updated = await prisma.teamMember.update({
      where: { id: member.id },
      data: { role: parsed.data.role },
    });

    return jsonSuccess({ member: updated });
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(error.message, 401);
    if (error instanceof InvalidJsonError) return jsonError(error.message, 400);

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.team.patch", error);
    if (databaseErrorResponse) return databaseErrorResponse;

    logger.error("api.team.patch", "Failed to update team member.", { error });
    return jsonError("تعذر تحديث العضو. حاول مرة أخرى.", 500);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAppUser();
    const { id } = await params;

    const member = await prisma.teamMember.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });

    if (!member) {
      return jsonError("العضو غير موجود.", 404);
    }

    await prisma.teamMember.delete({ where: { id: member.id } });

    return jsonSuccess({ deleted: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(error.message, 401);

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.team.delete", error);
    if (databaseErrorResponse) return databaseErrorResponse;

    logger.error("api.team.delete", "Failed to remove team member.", { error });
    return jsonError("تعذر حذف العضو. حاول مرة أخرى.", 500);
  }
}
