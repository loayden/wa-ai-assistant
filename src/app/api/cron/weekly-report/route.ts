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

function getWeeklyRange() {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 7);

  return { start, end };
}

function formatPeriod(start: Date, end: Date) {
  const formatter = new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "long",
    timeZone: "Africa/Cairo",
  });

  return `${formatter.format(start)} - ${formatter.format(end)}`;
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

function makeBars(params: { positive: number; neutral: number; negative: number; angry: number }) {
  const total = Math.max(1, params.positive + params.neutral + params.negative + params.angry);
  const pct = (value: number) => Math.round((value / total) * 100);

  return [
    { label: "إيجابي", value: pct(params.positive), color: "#10B981" },
    { label: "محايد", value: pct(params.neutral), color: "#2563EB" },
    { label: "سلبي", value: pct(params.negative), color: "#F59E0B" },
    { label: "غاضب", value: pct(params.angry), color: "#EF4444" },
  ];
}

function buildWeeklyEmail(params: {
  businessName: string;
  period: string;
  totalMessages: number;
  aiReplies: number;
  handoffs: number;
  leads: number;
  orders: number;
  revenue: number;
  averageRating: number | null;
  topQuestions: string[];
  insight: string;
  suggestion: string;
}) {
  const moodBars = makeBars({
    positive: Math.max(0, params.aiReplies - params.handoffs),
    neutral: Math.max(0, params.totalMessages - params.aiReplies - params.handoffs),
    negative: params.handoffs,
    angry: params.handoffs,
  });
  const questions = params.topQuestions.length ? params.topQuestions : ["لا توجد أسئلة متكررة كافية هذا الأسبوع."];

  return `<div dir="rtl" style="margin:0;background:#f7f8fb;padding:28px;font-family:Arial,'Tahoma',sans-serif;color:#111827">
    <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:24px;overflow:hidden">
      <div style="padding:28px;border-bottom:1px solid #edf0f5">
        <p style="margin:0 0 8px;color:#2563eb;font-weight:700;letter-spacing:.08em">kallem | كَلّم</p>
        <h1 style="margin:0;font-size:28px;line-height:1.35">تقريرك الأسبوعي</h1>
        <p style="margin:10px 0 0;color:#6b7280">${params.businessName} · ${params.period}</p>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:20px">
        ${[
          ["الرسائل", params.totalMessages],
          ["Leads", params.leads],
          ["طلبات", params.orders],
          ["التقييم", params.averageRating === null ? "—" : `${params.averageRating}/5`],
        ]
          .map(
            ([label, value]) =>
              `<div style="border:1px solid #edf0f5;border-radius:18px;padding:16px"><p style="margin:0;color:#6b7280;font-size:12px">${label}</p><strong style="display:block;margin-top:8px;font-size:24px">${value}</strong></div>`,
          )
          .join("")}
      </div>
      <div style="padding:0 20px 20px">
        <div style="border:1px solid #edf0f5;border-radius:20px;padding:18px">
          <h2 style="margin:0 0 14px;font-size:18px">مزاج المحادثات</h2>
          <p style="margin:0 0 12px;color:#6b7280">ردود AI: <strong>${params.aiReplies}</strong> · إيراد الطلبات: <strong>${(params.revenue / 100).toFixed(0)} جنيه</strong></p>
          ${moodBars
            .map(
              (bar) =>
                `<div style="margin:12px 0"><div style="display:flex;justify-content:space-between;font-size:13px;color:#4b5563"><span>${bar.label}</span><span>${bar.value}%</span></div><div style="margin-top:6px;height:9px;border-radius:999px;background:#eef2f7"><div style="width:${bar.value}%;height:9px;border-radius:999px;background:${bar.color}"></div></div></div>`,
            )
            .join("")}
        </div>
      </div>
      <div style="padding:0 20px 20px">
        <div style="background:#ecfdf5;border:1px solid #bbf7d0;border-radius:20px;padding:18px">
          <h2 style="margin:0 0 8px;font-size:17px">ملاحظة ذكية</h2>
          <p style="margin:0;line-height:1.8;color:#065f46">${params.insight}</p>
        </div>
      </div>
      <div style="padding:0 20px 20px">
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:20px;padding:18px">
          <h2 style="margin:0 0 8px;font-size:17px">اقتراح عملي</h2>
          <p style="margin:0;line-height:1.8;color:#1e3a8a">${params.suggestion}</p>
        </div>
      </div>
      <div style="padding:0 20px 24px">
        <h2 style="font-size:17px">أكثر الأسئلة ظهوراً</h2>
        <ol style="line-height:1.9;color:#374151">
          ${questions.map((question) => `<li>${question}</li>`).join("")}
        </ol>
        <p style="margin-top:22px;text-align:center">
          <a href="${appEnv.NEXT_PUBLIC_APP_URL}/dashboard" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:999px;padding:13px 22px;font-weight:700">عرض التفاصيل في لوحة التحكم</a>
        </p>
      </div>
    </div>
  </div>`;
}

function deriveTopQuestions(messages: Array<{ bodyText: string }>) {
  return messages
    .map((message) => message.bodyText.trim())
    .filter(Boolean)
    .slice(0, 3);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return jsonError("Unauthorized cron request.", 403);
  }

  const notificationPrefsReady = await hasNotificationPrefsColumn();

  if (!notificationPrefsReady) {
    return jsonSuccess({ processed: 0, emailed: 0, skipped: 0 });
  }

  const { start, end } = getWeeklyRange();
  const period = formatPeriod(start, end);

  let settingsRows: Array<{
    userId: string;
    notificationPrefs: Prisma.JsonValue | null;
    businessName: string | null;
    user: { email: string; fullName: string | null };
  }>;

  try {
    settingsRows = await prisma.userSettings.findMany({
      select: {
        userId: true,
        notificationPrefs: true,
        businessName: true,
        user: {
          select: {
            email: true,
            fullName: true,
          },
        },
      },
    });
  } catch (error) {
    if (/notification_prefs|user_settings/i.test(error instanceof Error ? error.message : String(error))) {
      logger.warn("api.cron.weekly-report", "Weekly report skipped because notification columns are not migrated yet.", { error });
      return jsonSuccess({ processed: 0, emailed: 0, skipped: 0 });
    }

    throw error;
  }

  let processed = 0;
  let emailed = 0;
  let skipped = 0;

  for (const settings of settingsRows) {
    const prefs = normalizeNotificationPrefs(settings.notificationPrefs);

    if (!prefs.weekly_report) {
      continue;
    }

    processed += 1;

    try {
      const [totalMessages, aiReplies, handoffs, leads, orders, orderRows, ratings, inboundSamples] = await Promise.all([
        prisma.message.count({
          where: { userId: settings.userId, createdAt: { gte: start, lt: end } },
        }),
        prisma.message.count({
          where: {
            userId: settings.userId,
            direction: MessageDirection.OUTBOUND,
            aiModelUsed: { not: null },
            createdAt: { gte: start, lt: end },
          },
        }),
        prisma.conversationHandoff.count({
          where: { userId: settings.userId, handoffAt: { gte: start, lt: end } },
        }),
        prisma.lead.count({
          where: { userId: settings.userId, detectedAt: { gte: start, lt: end } },
        }),
        prisma.order.count({
          where: { userId: settings.userId, createdAt: { gte: start, lt: end } },
        }),
        prisma.order.findMany({
          where: { userId: settings.userId, createdAt: { gte: start, lt: end }, status: { not: "cancelled" } },
          select: { subtotal: true },
        }),
        prisma.conversationHandoff.findMany({
          where: { userId: settings.userId, rating: { not: null }, resolvedAt: { gte: start, lt: end } },
          select: { rating: true },
        }),
        prisma.message.findMany({
          where: { userId: settings.userId, direction: MessageDirection.INBOUND, createdAt: { gte: start, lt: end } },
          orderBy: { createdAt: "desc" },
          take: 3,
          select: { bodyText: true },
        }),
      ]);

      if (totalMessages < 10) {
        skipped += 1;
        continue;
      }

      const ratingValues = ratings.map((row) => row.rating).filter((rating): rating is number => typeof rating === "number");
      const averageRating =
        ratingValues.length > 0 ? Math.round((ratingValues.reduce((sum, rating) => sum + rating, 0) / ratingValues.length) * 10) / 10 : null;
      const revenue = orderRows.reduce((sum, order) => sum + order.subtotal, 0);
      const businessName = settings.businessName || settings.user.fullName || "نشاطك التجاري";
      const insight =
        leads > 0
          ? `المساعد اكتشف ${leads} عميل محتمل هذا الأسبوع، وهذا يعني أن المحادثات بدأت تتحول إلى فرص بيع حقيقية. راقب هذه المحادثات سريعاً حتى لا تبرد النية الشرائية.`
          : "الرسائل وصلت لكن فرص البيع المكتشفة قليلة هذا الأسبوع. غالباً تحتاج قاعدة المعرفة أو قائمة المنتجات إلى تفاصيل أوضح عن الأسعار والخدمات.";
      const suggestion =
        orders > 0
          ? "راجع الطلبات المكتملة وأضف أشهر الأسئلة عن التوصيل والدفع في قاعدة المعرفة لتقليل التدخل اليدوي."
          : "أضف منتجاتك وأسعارك في صفحة المنتجات حتى يستطيع المساعد تحويل أسئلة العملاء إلى طلبات مباشرة داخل واتساب.";

      await sendEmail({
        to: settings.user.email,
        subject: `تقرير كَلّم الأسبوعي — ${businessName}`,
        html: buildWeeklyEmail({
          businessName,
          period,
          totalMessages,
          aiReplies,
          handoffs,
          leads,
          orders,
          revenue,
          averageRating,
          topQuestions: deriveTopQuestions(inboundSamples),
          insight,
          suggestion,
        }),
      });
      emailed += 1;
    } catch (error) {
      logger.warn("api.cron.weekly-report", "Weekly report failed for one user.", {
        error,
        userId: settings.userId,
      });
    }
  }

  return jsonSuccess({ processed, emailed, skipped });
}
