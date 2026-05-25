import { MessageDirection } from "@prisma/client";

import { UnauthorizedError, requireAppUser } from "@/lib/api/auth";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess, jsonValidationError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/utils/logger";
import { analyticsQuerySchema } from "@/lib/validators/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ARABIC_DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

function startOfLocalDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getRangeStart(days: number) {
  const today = startOfLocalDay(new Date());
  today.setDate(today.getDate() - (days - 1));
  return today;
}

export async function GET(request: Request) {
  try {
    const user = await requireAppUser();
    const { searchParams } = new URL(request.url);
    const parsed = analyticsQuerySchema.safeParse(Object.fromEntries(searchParams));

    if (!parsed.success) {
      return jsonValidationError(parsed.error);
    }

    const days = parsed.data.range === "30d" ? 30 : 7;
    const start = getRangeStart(days);
    const where = {
      userId: user.id,
      createdAt: {
        gte: start,
      },
    };

    const [messages, handoffs, leadsDetected, ratings, topInstagramPosts] = await Promise.all([
      prisma.message.findMany({
        where,
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          direction: true,
          fromNumber: true,
          connectionId: true,
          channel: true,
          createdAt: true,
          connection: {
            select: { id: true },
          },
        },
      }),
      prisma.conversationHandoff.count({
        where: {
          userId: user.id,
          handoffAt: {
            gte: start,
          },
        },
      }),
      prisma.lead.count({
        where: {
          userId: user.id,
          detectedAt: {
            gte: start,
          },
        },
      }),
      prisma.conversationHandoff.findMany({
        where: {
          userId: user.id,
          rating: { not: null },
          resolvedAt: {
            gte: start,
          },
        },
        select: { rating: true },
      }),
      prisma.instagramPostStats.findMany({
        where: {
          userId: user.id,
          lastUpdatedAt: {
            gte: start,
          },
        },
        orderBy: [{ leadCount: "desc" }, { dmCount: "desc" }, { commentCount: "desc" }],
        take: 5,
        select: {
          postId: true,
          postCaption: true,
          postMediaUrl: true,
          commentCount: true,
          leadCount: true,
          dmCount: true,
        },
      }),
    ]);

    const dailyMap = new Map<string, number>();
    for (let index = 0; index < days; index += 1) {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      dailyMap.set(dateKey(day), 0);
    }

    const conversationKeys = new Set<string>();
    const hourCounts = new Map<number, number>();
    const dayCounts = new Map<number, number>();
    let totalReplies = 0;
    const channelSplit = {
      whatsapp: 0,
      instagram: 0,
      messenger: 0,
    };

    for (const message of messages) {
      if (message.direction === MessageDirection.OUTBOUND) {
        totalReplies += 1;
        const key = dateKey(message.createdAt);
        dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
      } else {
        const key = `${message.connection?.id ?? message.connectionId}:${message.fromNumber}`;
        conversationKeys.add(key);
        const hour = message.createdAt.getHours();
        const day = message.createdAt.getDay();
        hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
        dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
      }

      const channel = message.channel in channelSplit ? (message.channel as keyof typeof channelSplit) : "whatsapp";

      if (message.direction === MessageDirection.OUTBOUND) {
        channelSplit[channel] += 1;
      }
    }

    const busiestHour = [...hourCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const busiestDayNumber = [...dayCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const ratingValues = ratings.map((item) => item.rating).filter((rating): rating is number => typeof rating === "number");
    const averageRating =
      ratingValues.length > 0
        ? Math.round((ratingValues.reduce((sum, rating) => sum + rating, 0) / ratingValues.length) * 10) / 10
        : null;

    return jsonSuccess({
      totalReplies,
      totalConversations: conversationKeys.size,
      handoffs,
      leadsDetected,
      busiestHour,
      busiestDay: busiestDayNumber === null ? null : ARABIC_DAYS[busiestDayNumber],
      dailyReplies: [...dailyMap.entries()].map(([date, count]) => ({ date, count })),
      channelSplit,
      topInstagramPosts,
      averageRating,
      ratingCount: ratingValues.length,
      planTier: user.planTier,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(error.message, 401);
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.analytics.summary", error);

    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }

    logger.error("api.analytics.summary", "Failed to build analytics summary.", { error });
    return jsonError("Failed to load analytics.", 500);
  }
}
