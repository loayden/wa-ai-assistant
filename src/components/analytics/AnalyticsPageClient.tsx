// FILE: src/components/analytics/AnalyticsPageClient.tsx
"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: The analytics surface uses CSS bars instead of a chart library,
 * keeping Phase 3 focused and production-safe.
 */
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart2, Bot, Clock3, MessageSquareText, RefreshCcw, Star, Target, UserRoundCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiData } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { AnalyticsSummaryResponse } from "@/types/api";

type RangeValue = "7d" | "30d";

const RANGE_LABELS: Record<RangeValue, string> = {
  "7d": "آخر 7 أيام",
  "30d": "آخر 30 يوم",
};

function formatHour(hour: number | null) {
  if (hour === null) {
    return "لا توجد بيانات";
  }

  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return new Intl.DateTimeFormat("ar-EG", { hour: "numeric" }).format(date);
}

function compactDate(value: string) {
  return new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "short" }).format(new Date(`${value}T00:00:00`));
}

export function AnalyticsPageClient() {
  const [range, setRange] = useState<RangeValue>("7d");
  const [summary, setSummary] = useState<AnalyticsSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadSummary(nextRange = range) {
    setLoading(true);
    setError(null);

    try {
      const data = await apiData<AnalyticsSummaryResponse>(`/api/analytics/summary?range=${nextRange}`);
      setSummary(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذر تحميل التحليلات.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSummary(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const maxDailyReplies = useMemo(() => Math.max(1, ...(summary?.dailyReplies.map((item) => item.count) ?? [0])), [summary]);
  const channelTotal = (summary?.channelSplit.whatsapp ?? 0) + (summary?.channelSplit.instagram ?? 0) + (summary?.channelSplit.messenger ?? 0);
  const whatsappPercent = channelTotal > 0 ? Math.round(((summary?.channelSplit.whatsapp ?? 0) / channelTotal) * 100) : 0;
  const instagramPercent = channelTotal > 0 ? Math.round(((summary?.channelSplit.instagram ?? 0) / channelTotal) * 100) : 0;
  const messengerPercent = channelTotal > 0 ? Math.max(0, 100 - whatsappPercent - instagramPercent) : 0;
  const locked = summary?.planTier === "FREE";

  return (
    <div className="relative mx-auto max-w-[1120px] px-3 pb-24 pt-4 sm:px-6 lg:pb-10 lg:pt-10">
      <header className="mb-4 overflow-hidden rounded-[22px] border border-wa-gray-100 bg-white shadow-[0_18px_56px_rgba(13,20,33,0.05)] sm:mb-5 sm:rounded-[28px]">
        <div className="grid gap-5 bg-[linear-gradient(135deg,#ffffff_0%,#f6f8ff_100%)] p-4 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <Link
              className="mb-4 inline-flex min-h-9 items-center gap-2 rounded-full border border-wa-gray-100 bg-white px-3 text-body-sm font-semibold text-wa-gray-600 transition hover:bg-wa-gray-50 sm:min-h-10 sm:px-4"
              href="/dashboard"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              الرئيسية
            </Link>
            <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">التحليلات</p>
            <h1 className="mt-2 text-[29px] font-semibold leading-tight text-wa-gray-900 sm:text-[46px]">تأثير المساعد على المحادثات</h1>
            <p className="mt-3 max-w-[720px] text-body-sm leading-6 text-wa-gray-600 sm:text-body-lg" dir="rtl">
              أرقام بسيطة توضّح عدد الردود، المحادثات، العملاء المحتملين، ومتى يكون العملاء أكثر نشاطًا.
            </p>
          </div>
          <div className="flex gap-2 overflow-x-auto rounded-full border border-wa-gray-100 bg-white p-1">
            {(Object.keys(RANGE_LABELS) as RangeValue[]).map((item) => (
              <button
                key={item}
                type="button"
                className={cn(
                  "min-h-10 shrink-0 rounded-full px-4 text-body-sm font-semibold transition",
                  range === item ? "bg-wa-blue-600 text-white shadow-[0_10px_22px_rgba(48,86,255,0.20)]" : "text-wa-gray-600 hover:bg-wa-gray-50",
                )}
                onClick={() => setRange(item)}
              >
                {RANGE_LABELS[item]}
              </button>
            ))}
          </div>
        </div>
      </header>

      {loading ? (
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-32 rounded-[24px]" />)}
          </div>
          <Skeleton className="h-[360px] rounded-[28px]" />
        </div>
      ) : error ? (
        <section className="rounded-[24px] border border-wa-gray-100 bg-white p-6 text-center shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:p-10">
          <BarChart2 className="mx-auto size-10 text-wa-blue-600" aria-hidden="true" />
          <p className="mt-3 text-h3 font-semibold text-wa-gray-900">تعذر تحميل التحليلات</p>
          <p className="mt-2 text-body-sm text-wa-gray-600">{error}</p>
          <Button className="mt-4 rounded-full" onClick={() => void loadSummary(range)}>
            <RefreshCcw className="size-4" aria-hidden="true" />
            حاول مرة أخرى
          </Button>
        </section>
      ) : summary ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <MetricCard icon={<Bot className="size-5" aria-hidden="true" />} label="إجمالي الردود" value={summary.totalReplies} />
            <MetricCard icon={<MessageSquareText className="size-5" aria-hidden="true" />} label="المحادثات" value={summary.totalConversations} />
            <MetricCard icon={<UserRoundCheck className="size-5" aria-hidden="true" />} label="تحويل للبشر" value={summary.handoffs} />
            <MetricCard icon={<Target className="size-5" aria-hidden="true" />} label="عملاء محتملون" value={summary.leadsDetected} />
            <MetricCard
              icon={<Star className="size-5" aria-hidden="true" />}
              label="متوسط التقييم"
              value={summary.ratingCount >= 3 && summary.averageRating !== null ? `⭐ ${summary.averageRating} / 5` : "لا توجد تقييمات كافية"}
            />
          </section>

          <section className="relative mt-4 overflow-hidden rounded-[24px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:mt-5 sm:rounded-[28px] sm:p-6">
            <div className={cn("transition", locked && "blur-[3px]")}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">الردود اليومية</p>
                  <h2 className="mt-1 text-h3 font-semibold text-wa-gray-900">ردود AI خلال الفترة</h2>
                </div>
                <p className="text-body-sm text-wa-gray-600">{RANGE_LABELS[range]}</p>
              </div>
              <div className="mt-6 flex h-[240px] items-end gap-2 rounded-[22px] bg-wa-gray-50 p-3 sm:h-[300px] sm:gap-3 sm:p-5">
                {summary.dailyReplies.map((item) => (
                  <div key={item.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                    <div className="flex w-full flex-1 items-end justify-center">
                      <div
                        className="w-full max-w-8 rounded-t-xl bg-wa-blue-600 transition-all"
                        style={{ height: `${Math.max(6, (item.count / maxDailyReplies) * 100)}%` }}
                        aria-label={`${item.count.toLocaleString("ar-EG")} رد في ${item.date}`}
                      />
                    </div>
                    <span className="w-full truncate text-center text-[10px] font-medium text-wa-gray-500 sm:text-xs">{compactDate(item.date)}</span>
                  </div>
                ))}
              </div>
            </div>
            {locked ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white/58 p-5 backdrop-blur-[1px]">
                <div className="max-w-[360px] rounded-[24px] border border-wa-gray-100 bg-white p-5 text-center shadow-[0_18px_50px_rgba(13,20,33,0.10)]" dir="rtl">
                  <p className="text-h3 font-semibold text-wa-gray-900">هذه الميزة متاحة في خطة Pro</p>
                  <p className="mt-2 text-body-sm leading-6 text-wa-gray-600">افتح التحليلات الكاملة لمعرفة أكثر الأوقات نشاطًا وقياس قيمة الردود التلقائية.</p>
                  <Link
                    href="/billing"
                    className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-wa-blue-600 px-5 text-body-sm font-semibold text-white transition hover:bg-[#1447E6]"
                  >
                    ترقية الآن
                  </Link>
                </div>
              </div>
            ) : null}
          </section>

          <section className="mt-4 grid gap-4 sm:mt-5 lg:grid-cols-2">
            <InfoCard
              icon={<Clock3 className="size-5" aria-hidden="true" />}
              label="أنشط ساعة في اليوم"
              value={formatHour(summary.busiestHour)}
              detail={summary.busiestDay ? `أكثر يوم نشاطًا: ${summary.busiestDay}` : "ستظهر بعد وصول محادثات أكثر."}
            />
            <section className="rounded-[24px] border border-wa-gray-100 bg-white p-5 shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px] sm:p-6">
              <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">توزيع القنوات</p>
              <div className="mt-4 space-y-4">
                <ChannelBar label="واتساب" percent={whatsappPercent} tone="whatsapp" />
                <ChannelBar label="إنستجرام" percent={instagramPercent} tone="instagram" />
                <ChannelBar label="ماسنجر" percent={messengerPercent} tone="messenger" />
              </div>
            </section>
          </section>

          {summary.topInstagramPosts.length > 0 ? (
            <section className="mt-4 rounded-[24px] border border-wa-gray-100 bg-white p-5 shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:mt-5 sm:rounded-[28px] sm:p-6" dir="rtl">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-label font-semibold uppercase tracking-widest text-pink-600">Instagram</p>
                  <h2 className="mt-1 text-h3 font-semibold text-wa-gray-900">أفضل المنشورات أداءً</h2>
                  <p className="mt-1 text-body-sm text-wa-gray-600">المنشورات التي جلبت أكبر عدد من التعليقات والرسائل الخاصة والعملاء المحتملين.</p>
                </div>
                <Link href="/leads" className="inline-flex min-h-10 items-center justify-center rounded-full border border-wa-gray-100 px-4 text-body-sm font-semibold text-wa-gray-700 transition hover:bg-wa-gray-50">
                  عرض العملاء
                </Link>
              </div>

              <div className="mt-5 grid gap-3">
                {summary.topInstagramPosts.map((post) => (
                  <article key={post.postId} className="grid gap-3 rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-body-sm font-semibold text-wa-gray-900">
                        {post.postCaption ?? `منشور ${post.postId}`}
                      </p>
                      <p className="mt-1 text-xs text-wa-gray-500">{post.postId}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <PostStat label="تعليق" value={post.commentCount} />
                      <PostStat label="Leads" value={post.leadCount} />
                      <PostStat label="DM" value={post.dmCount} />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: ReactNode; label: string; value: number | string }) {
  return (
    <section className="rounded-[22px] border border-wa-gray-100 bg-white p-4 shadow-[0_12px_36px_rgba(13,20,33,0.04)] sm:rounded-[26px] sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-wa-blue-50 text-wa-blue-600">{icon}</span>
        <span className="rounded-full bg-wa-gray-50 px-2.5 py-1 text-label font-semibold uppercase tracking-widest text-wa-gray-500">مباشر</span>
      </div>
      <p className="mt-4 text-label font-semibold uppercase tracking-widest text-wa-gray-400">{label}</p>
      <p className="mt-1 text-[28px] font-semibold leading-tight text-wa-gray-900">{typeof value === "number" ? value.toLocaleString("ar-EG") : value}</p>
    </section>
  );
}

function InfoCard({ detail, icon, label, value }: { detail: string; icon: ReactNode; label: string; value: string }) {
  return (
    <section className="rounded-[24px] border border-wa-gray-100 bg-white p-5 shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px] sm:p-6">
      <span className="flex size-11 items-center justify-center rounded-2xl bg-wa-blue-50 text-wa-blue-600">{icon}</span>
      <p className="mt-4 text-label font-semibold uppercase tracking-widest text-wa-gray-400">{label}</p>
      <p className="mt-1 text-h2 font-semibold text-wa-gray-900">{value}</p>
      <p className="mt-2 text-body-sm leading-6 text-wa-gray-600">{detail}</p>
    </section>
  );
}

function PostStat({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-xl bg-white px-3 py-2 shadow-[0_8px_22px_rgba(13,20,33,0.04)]">
      <span className="block text-base font-semibold text-wa-gray-900">{value.toLocaleString("ar-EG")}</span>
      <span className="block text-[10px] font-semibold text-wa-gray-400">{label}</span>
    </span>
  );
}

function ChannelBar({ label, percent, tone }: { label: string; percent: number; tone: "whatsapp" | "instagram" | "messenger" }) {
  const barClass =
    tone === "whatsapp"
      ? "bg-wa-success"
      : tone === "instagram"
        ? "bg-[linear-gradient(90deg,#833AB4,#E1306C)]"
        : "bg-blue-500";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-body-sm">
        <span className="font-semibold text-wa-gray-900">{label}</span>
        <span className="text-wa-gray-500">{percent}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-wa-gray-100">
        <div
          className={cn("h-full rounded-full", barClass)}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
