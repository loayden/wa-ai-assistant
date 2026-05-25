import { UnauthorizedError, requireAppUser } from "@/lib/api/auth";
import { serializeLead } from "@/lib/api/leads";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess, jsonValidationError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/utils/logger";
import { leadsQuerySchema } from "@/lib/validators/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireAppUser();
    const { searchParams } = new URL(request.url);
    const parsed = leadsQuerySchema.safeParse(Object.fromEntries(searchParams));

    if (!parsed.success) {
      return jsonValidationError(parsed.error);
    }

    const where = {
      userId: user.id,
      status: parsed.data.status,
      channel: parsed.data.channel,
    };

    const [leads, total, instagramCommentLeads] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { detectedAt: "desc" },
        take: 100,
      }),
      prisma.lead.count({ where }),
      prisma.instagramCommentLead.findMany({
        where: {
          userId: user.id,
          ...(parsed.data.status
            ? {
                lead: {
                  status: parsed.data.status,
                },
              }
            : {}),
          ...(parsed.data.channel && parsed.data.channel !== "instagram"
            ? {
                id: "__no_instagram_comment_leads_for_channel_filter__",
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          commentText: true,
          commenterId: true,
          commenterName: true,
          postId: true,
          postCaption: true,
          isLead: true,
          dmSent: true,
          leadId: true,
          createdAt: true,
        },
      }),
    ]);

    return jsonSuccess(
      {
        leads: leads.map(serializeLead),
        instagramCommentLeads: instagramCommentLeads.map((comment) => ({
          ...comment,
          createdAt: comment.createdAt.toISOString(),
        })),
      },
      {
        meta: { total },
      },
    );
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(error.message, 401);
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.leads.get", error);

    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }

    logger.error("api.leads.get", "Failed to load leads.", { error });
    return jsonError("Failed to load leads.", 500);
  }
}
