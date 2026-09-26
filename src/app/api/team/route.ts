import { z } from "zod";

import { UnauthorizedError, requireAppUser } from "@/lib/api/auth";
import { InvalidJsonError, readJsonRequestBody } from "@/lib/api/request";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess, jsonValidationError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const TEAM_ROLES = ["admin", "member"] as const;

const inviteTeamMemberSchema = z.object({
  email: z.string({ required_error: "البريد الإلكتروني مطلوب." }).trim().toLowerCase().email("اكتب بريداً إلكترونياً صحيحاً.").max(160, "البريد طويل جداً."),
  role: z.enum(TEAM_ROLES),
});

function serializeTeamMember(member: {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...member,
    createdAt: member.createdAt.toISOString(),
    updatedAt: member.updatedAt.toISOString(),
  };
}

export async function GET() {
  try {
    const user = await requireAppUser();
    const members = await prisma.teamMember.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });

    return jsonSuccess({
      members: members.map(serializeTeamMember),
      ownerEmail: user.email,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(error.message, 401);

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.team.get", error);
    if (databaseErrorResponse) return databaseErrorResponse;

    logger.error("api.team.get", "Failed to load team members.", { error });
    return jsonError("تعذر تحميل أعضاء الفريق. حاول مرة أخرى.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const parsed = inviteTeamMemberSchema.safeParse(await readJsonRequestBody(request));

    if (!parsed.success) {
      return jsonValidationError(parsed.error);
    }

    if (parsed.data.email === user.email.toLowerCase()) {
      return jsonError("هذا بريدك أنت — أنت مالك الحساب بالفعل.", 400);
    }

    const existing = await prisma.teamMember.findUnique({
      where: { userId_email: { userId: user.id, email: parsed.data.email } },
      select: { id: true },
    });

    if (existing) {
      return jsonError("هذا العضو مدعو بالفعل.", 409);
    }

    const member = await prisma.teamMember.create({
      data: {
        userId: user.id,
        email: parsed.data.email,
        role: parsed.data.role,
        status: "invited",
      },
    });

    return jsonSuccess({ member: serializeTeamMember(member) }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(error.message, 401);
    if (error instanceof InvalidJsonError) return jsonError(error.message, 400);

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.team.post", error);
    if (databaseErrorResponse) return databaseErrorResponse;

    logger.error("api.team.post", "Failed to invite team member.", { error });
    return jsonError("تعذر إرسال الدعوة. حاول مرة أخرى.", 500);
  }
}
