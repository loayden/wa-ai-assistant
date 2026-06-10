"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Package,
  RadioTower,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { apiData } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { LaunchReadinessResponse, ReadinessCategory, ReadinessCheck, ReadinessStatus } from "@/types/api";

type ReadinessPageClientProps = {
  initialReadiness: LaunchReadinessResponse;
};

const categoryLabels: Record<ReadinessCategory, string> = {
  channels: "القنوات",
  ai: "المساعد",
  business: "النشاط",
  commerce: "البيع",
  payments: "الدفع",
  campaigns: "الحملات",
};

const categoryIcons: Record<ReadinessCategory, typeof RadioTower> = {
  channels: RadioTower,
  ai: Sparkles,
  business: ShieldCheck,
  commerce: Package,
  payments: CreditCard,
  campaigns: Sparkles,
};

function getScoreTone(score: number) {
  if (score >= 90) {
    return {
      label: "جاهز للإطلاق",
      body: "الإعدادات الأساسية جاهزة. راجع التحذيرات الصغيرة فقط قبل الإعلان للجمهور.",
      dot: "bg-wa-success",
      text: "text-wa-success",
      bg: "bg-wa-success-bg",
      bar: "bg-wa-success",
      border: "border-wa-success-bg",
    };
  }

  if (score >= 60) {
    return {
      label: "قريب من الإطلاق",
      body: "المنتج يعمل، لكن توجد نقاط قد توقف الردود أو تقلل ثقة المستخدمين.",
      dot: "bg-wa-warning",
      text: "text-wa-warning",
      bg: "bg-wa-warning-bg",
      bar: "bg-wa-warning",
      border: "border-wa-warning-bg",
    };
  }

  return {
    label: "يحتاج إعداد قبل الإطلاق",
    body: "لا تفتح التطبيق للعملاء قبل إصلاح العناصر الحرجة حتى لا تصل رسائل بلا رد.",
    dot: "bg-wa-error",
    text: "text-wa-error",
    bg: "bg-wa-error-bg",
    bar: "bg-wa-error",
    border: "border-wa-error-bg",
  };
}

function statusTone(status: ReadinessStatus) {
  if (status === "pass") {
    return {
      icon: CheckCircle2,
      label: "جاهز",
      border: "border-wa-success-bg",
      bg: "bg-wa-success-bg/50",
      iconBg: "bg-wa-success-bg text-wa-success",
      text: "text-wa-success",
    };
  }

  if (status === "warn") {
    return {
      icon: AlertTriangle,
      label: "تحذير",
      border: "border-wa-warning-bg",
      bg: "bg-wa-warning-bg/50",
      iconBg: "bg-wa-warning-bg text-wa-warning",
      text: "text-wa-warning",
    };
  }

  return {
    icon: XCircle,
    label: "يحتاج إصلاح",
    border: "border-wa-error-bg",
    bg: "bg-wa-error-bg/50",
    iconBg: "bg-wa-error-bg text-wa-error",
    text: "text-wa-error",
  };
}

function sortChecks(checks: ReadinessCheck[]) {
  const order: Record<ReadinessStatus, number> = { fail: 0, warn: 1, pass: 2 };
  return [...checks].sort((a, b) => order[a.status] - order[b.status]);
}

export function ReadinessPageClient({ initialReadiness }: ReadinessPageClientProps) {
  const readinessQuery = useQuery({
    queryKey: ["readiness", "full"],
    queryFn: () => apiData<LaunchReadinessResponse>("/api/readiness/check"),
    initialData: initialReadiness,
    staleTime: 60_000,
  });
  const readiness = readinessQuery.data;
  const tone = getScoreTone(readiness.score);
  const blockingChecks = readiness.checks.filter((check) => check.status !== "pass");
  const codeBlockingChecks = blockingChecks.filter((check) => !check.isManual);
  const manualBlockingChecks = blockingChecks.filter((check) => check.isManual);
  const categories = readiness.checks.reduce(
    (acc, check) => {
      acc[check.category] = (acc[check.category] ?? 0) + (check.status === "pass" ? 1 : 0);
      return acc;
    },
    {} as Partial<Record<ReadinessCategory, number>>,
  );

  return (
    <div className="kallem-workspace-page" dir="rtl">
      <section className={cn("workspace-hero rounded-[28px] border bg-white p-4 shadow-[0_18px_60px_rgba(13,20,33,0.05)] sm:p-6 lg:p-7", tone.border)}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-body-sm font-semibold", tone.bg, tone.text)}>
                <span className={cn("size-2 rounded-full", tone.dot)} aria-hidden="true" />
                {tone.label}
              </span>
              <span className="rounded-full bg-wa-gray-50 px-3 py-1 text-body-sm font-semibold text-wa-gray-600">
                {readiness.passed} من {readiness.total} فحوصات جاهزة
              </span>
            </div>
            <h1 className="mt-4 text-h1 font-semibold text-wa-gray-900 sm:text-display">جاهزية الإطلاق</h1>
            <p className="mt-2 max-w-[680px] text-body leading-7 text-wa-gray-600">{tone.body}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              <SummaryPill label="جاهز" value={readiness.passed} variant="success" />
              <SummaryPill label="تحذيرات" value={readiness.warnings} variant="warning" />
              <SummaryPill label="مشاكل حرجة" value={readiness.failed} variant="error" />
              <SummaryPill label="خطوات خارجية" value={manualBlockingChecks.length} variant="warning" />
            </div>
          </div>

          <div className="rounded-[24px] border border-wa-gray-100 bg-wa-gray-50 p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">درجة الجاهزية</p>
                <p className={cn("mt-2 text-[52px] font-semibold leading-none", tone.text)}>{readiness.score}</p>
              </div>
              <span className="pb-1 text-h3 font-semibold text-wa-gray-400">/100</span>
            </div>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-white">
              <div className={cn("h-full rounded-full transition-all", tone.bar)} style={{ width: `${readiness.score}%` }} />
            </div>
            <Button
              className="mt-5 w-full rounded-full"
              isLoading={readinessQuery.isFetching}
              variant={readiness.score >= 90 ? "secondary" : "default"}
              onClick={() => void readinessQuery.refetch()}
            >
              {!readinessQuery.isFetching ? <RefreshCw className="size-4" aria-hidden="true" /> : null}
              إعادة الفحص
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        {(Object.keys(categoryLabels) as ReadinessCategory[]).map((category) => {
          const Icon = categoryIcons[category];
          const total = readiness.checks.filter((check) => check.category === category).length;

          if (total === 0) {
            return null;
          }

          return (
            <div key={category} className="rounded-[20px] border border-wa-gray-100 bg-white p-4 shadow-[0_10px_30px_rgba(13,20,33,0.035)]">
              <span className="flex size-9 items-center justify-center rounded-2xl bg-wa-blue-50 text-wa-blue-600">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <p className="mt-3 text-body-sm font-semibold text-wa-gray-900">{categoryLabels[category]}</p>
              <p className="mt-1 text-label font-semibold text-wa-gray-500">
                {categories[category] ?? 0} / {total} جاهز
              </p>
            </div>
          );
        })}
      </section>

      {blockingChecks.length > 0 ? (
        <section className="mt-5 rounded-[24px] border border-wa-gray-100 bg-white p-4 shadow-[0_12px_42px_rgba(13,20,33,0.04)] sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">أصلح هذه أولًا</p>
              <h2 className="mt-1 text-h2 font-semibold text-wa-gray-900">ما يمكن إصلاحه داخل التطبيق وما يحتاج خطوة خارجية</h2>
            </div>
            <Link href="/support" className="text-body-sm font-semibold text-wa-blue-600 hover:underline">
              تحتاج مساعدة؟
            </Link>
          </div>
          <div className="mt-4 space-y-5">
            {codeBlockingChecks.length > 0 ? (
              <IssueGroup title="داخل التطبيق أو الإعدادات" description="هذه عناصر يمكن إصلاحها من صفحات kallem أو بإعادة الفحص." checks={codeBlockingChecks} />
            ) : null}
            {manualBlockingChecks.length > 0 ? (
              <IssueGroup title="خطوات خارجية قبل الإطلاق" description="هذه عناصر تحتاج إجراء في Meta أو OpenAI أو Paymob قبل استقبال عملاء حقيقيين." checks={manualBlockingChecks} />
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">كل الفحوصات</p>
            <h2 className="mt-1 text-h2 font-semibold text-wa-gray-900">تفاصيل الجاهزية</h2>
          </div>
          <span className="text-body-sm text-wa-gray-500">
            آخر فحص: {new Intl.DateTimeFormat("ar-EG", { hour: "2-digit", minute: "2-digit" }).format(new Date(readiness.generatedAt))}
          </span>
        </div>
        <div className="grid gap-3">
          {sortChecks(readiness.checks).map((check) => (
            <CheckCard key={check.id} check={check} compact={check.status === "pass"} />
          ))}
        </div>
      </section>
    </div>
  );
}

function SummaryPill({ label, value, variant }: { label: string; value: number; variant: "success" | "warning" | "error" }) {
  const classes = {
    success: "bg-wa-success-bg text-wa-success",
    warning: "bg-wa-warning-bg text-wa-warning",
    error: "bg-wa-error-bg text-wa-error",
  }[variant];

  return (
    <div className={cn("rounded-2xl px-4 py-3", classes)}>
      <p className="text-label font-semibold uppercase tracking-widest">{label}</p>
      <p className="mt-1 text-h2 font-semibold">{value}</p>
    </div>
  );
}

function IssueGroup({ title, description, checks }: { title: string; description: string; checks: ReadinessCheck[] }) {
  return (
    <div>
      <div className="mb-3">
        <h3 className="text-body font-semibold text-wa-gray-900">{title}</h3>
        <p className="mt-1 text-body-sm text-wa-gray-500">{description}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {checks.map((check) => (
          <CheckCard key={check.id} check={check} />
        ))}
      </div>
    </div>
  );
}

function CheckCard({ check, compact = false }: { check: ReadinessCheck; compact?: boolean }) {
  const tone = statusTone(check.status);
  const Icon = tone.icon;

  return (
    <article className={cn("rounded-[20px] border bg-white p-4 transition", tone.border, compact ? "" : tone.bg)}>
      <div className="flex items-start gap-3">
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-2xl", tone.iconBg)}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-body font-semibold text-wa-gray-900">{check.label}</h3>
            <div className="flex flex-wrap items-center gap-2">
              {check.isManual ? (
                <span className="rounded-full bg-wa-gray-100 px-2.5 py-1 text-label font-semibold text-wa-gray-600">
                  خطوة خارجية
                </span>
              ) : null}
              <span className={cn("rounded-full px-2.5 py-1 text-label font-semibold", tone.iconBg)}>{tone.label}</span>
            </div>
          </div>
          <p className="mt-1 text-body-sm leading-6 text-wa-gray-600">{check.message}</p>
          {check.action && check.actionHref ? (
            <Link
              href={check.actionHref}
              className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-full bg-white px-4 text-body-sm font-semibold text-wa-blue-600 transition hover:bg-wa-blue-50"
            >
              {check.action}
              <ArrowRight className="size-4 rotate-180" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
