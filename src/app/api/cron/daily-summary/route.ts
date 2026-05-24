import { MessageDirection } from "@prisma/client";
import type { Prisma } from "@prisma/client";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { normalizeNotificationPrefs } from "@/lib/notifications/preferences";
import { prisma } from "@/lib/prisma/client";
import { sendEmail } from "@/lib/resend/client";
import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  if (!appEnv.CRON_SECRET) {
    return appEnv.NODE_ENV !== "production";
  }

  return request.headers.get("authorization") === `Bearer ${appEnv.CRON_SECRET}`;
}

function getYesterdayRange() {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 1);

  return { start, end };
}

async function hasNotificationPrefsColumn() {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'user_settings'
        AND column_name = 'notification_prefs'
    ) AS "exists"
  `;

  return rows[0]?.exists === true;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return jsonError("Unauthorized cron request.", 403);
  }

  const { start, end } = getYesterdayRange();
  const notificationPrefsReady = await hasNotificationPrefsColumn();

  if (!notificationPrefsReady) {
    return jsonSuccess({ processed: 0, emailed: 0 });
  }

  let settingsRows: Array<{
    userId: string;
    notificationPrefs: Prisma.JsonValue | null;
    user: { email: string };
  }>;

  try {
    settingsRows = await prisma.userSettings.findMany({
      select: {
        userId: true,
        notificationPrefs: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    });
  } catch (error) {
    if (/notification_prefs|onboarding_completed/i.test(error instanceof Error ? error.message : String(error))) {
      logger.warn("api.cron.daily-summary", "Daily summary skipped because notification columns are not migrated yet.", {
        error,
      });
      return jsonSuccess({ processed: 0, emailed: 0 });
    }

    throw error;
  }
  let processed = 0;
  let emailed = 0;

  for (const settings of settingsRows) {
    const prefs = normalizeNotificationPrefs(settings.notificationPrefs);

    if (!prefs.daily_summary) {
      continue;
    }

    processed += 1;

    try {
      const [replies, leads, resolvedThreads, ratedThreads] = await Promise.all([
        prisma.message.count({
          where: {
            userId: settings.userId,
            direction: MessageDirection.OUTBOUND,
            createdAt: { gte: start, lt: end },
          },
        }),
        prisma.lead.count({
          where: {
            userId: settings.userId,
            detectedAt: { gte: start, lt: end },
          },
        }),
        prisma.conversationHandoff.count({
          where: {
            userId: settings.userId,
            resolvedAt: { gte: start, lt: end },
          },
        }),
        prisma.conversationHandoff.findMany({
          where: {
            userId: settings.userId,
            rating: { not: null },
            resolvedAt: { gte: start, lt: end },
          },
          select: { rating: true },
        }),
      ]);
      const ratings = ratedThreads.map((thread) => thread.rating).filter((rating): rating is number => typeof rating === "number");
      const averageRating =
        ratings.length > 0 ? Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10) / 10 : null;

      await sendEmail({
        to: settings.user.email,
        subject: "ملخص kallem اليومي",
        html: `<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8">
          <h2>ملخص أمس</h2>
          <p>ردود AI: <strong>${replies}</strong></p>
          <p>عملاء محتملون جدد: <strong>${leads}</strong></p>
          <p>محادثات مغلقة: <strong>${resolvedThreads}</strong></p>
          <p>متوسط التقييم: <strong>${averageRating === null ? "لا توجد تقييمات" : `${averageRating}/5`}</strong></p>
          <p><a href="${appEnv.NEXT_PUBLIC_APP_URL}/dashboard">افتح لوحة التحكم</a></p>
        </div>`,
      });
      emailed += 1;
    } catch (error) {
      logger.warn("api.cron.daily-summary", "Daily summary failed for one user.", {
        error,
        userId: settings.userId,
      });
    }
  }

  return jsonSuccess({
    processed,
    emailed,
  });
}
