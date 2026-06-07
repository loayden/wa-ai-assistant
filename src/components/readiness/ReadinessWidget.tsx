"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, ShieldCheck } from "lucide-react";

import { useLaunchReadiness } from "@/hooks/useReadiness";
import { cn } from "@/lib/utils";

function getTone(score: number) {
  if (score >= 90) {
    return {
      border: "border-wa-success-bg",
      bg: "bg-wa-success-bg/45",
      text: "text-wa-success",
      bar: "bg-wa-success",
      track: "bg-white",
    };
  }

  if (score >= 60) {
    return {
      border: "border-wa-warning-bg",
      bg: "bg-wa-warning-bg/65",
      text: "text-wa-warning",
      bar: "bg-wa-warning",
      track: "bg-white",
    };
  }

  return {
    border: "border-wa-error-bg",
    bg: "bg-wa-error-bg/65",
    text: "text-wa-error",
    bar: "bg-wa-error",
    track: "bg-white",
  };
}

function issueText(failed: number, warnings: number) {
  if (failed > 0) {
    return `${failed} ${failed === 1 ? "مشكلة حرجة" : "مشاكل حرجة"} تحتاج إصلاحًا قبل الإطلاق`;
  }

  return `${warnings} ${warnings === 1 ? "تحذير" : "تحذيرات"} لتحسين جاهزية التطبيق`;
}

export function ReadinessWidget() {
  const readinessQuery = useLaunchReadiness("full");

  if (readinessQuery.isLoading) {
    return (
      <section className="mb-4 rounded-[22px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_38px_rgba(13,20,33,0.04)] sm:mb-5 sm:rounded-[28px]">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-wa-gray-50 text-wa-blue-600">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="h-4 w-40 rounded-full bg-wa-gray-100" />
            <div className="mt-2 h-2 w-full max-w-[520px] overflow-hidden rounded-full bg-wa-gray-100">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-wa-gray-200" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (readinessQuery.isError) {
    return (
      <Link
        href="/readiness"
        className="mb-4 flex items-center justify-between gap-3 rounded-[22px] border border-wa-error-bg bg-wa-error-bg/55 p-4 text-wa-error shadow-[0_14px_38px_rgba(13,20,33,0.04)] transition hover:bg-wa-error-bg sm:mb-5 sm:rounded-[28px]"
      >
        <span className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-white">
            <AlertTriangle className="size-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-body font-semibold">تعذر فحص جاهزية الإطلاق</span>
            <span className="block text-body-sm">افتح صفحة الجاهزية لإعادة المحاولة.</span>
          </span>
        </span>
        <ArrowRight className="size-4 rotate-180" aria-hidden="true" />
      </Link>
    );
  }

  const readiness = readinessQuery.data;

  if (!readiness || readiness.score >= 90) {
    return null;
  }

  const tone = getTone(readiness.score);

  return (
    <Link
      href="/readiness"
      className={cn(
        "mb-4 block rounded-[22px] border p-4 shadow-[0_14px_38px_rgba(13,20,33,0.04)] transition hover:-translate-y-0.5 sm:mb-5 sm:rounded-[28px]",
        tone.border,
        tone.bg,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-wa-blue-600">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className={cn("text-label font-semibold uppercase tracking-widest", tone.text)}>جاهزية الإطلاق</p>
            <h2 className="mt-1 text-body font-semibold text-wa-gray-900">
              {issueText(readiness.failed, readiness.warnings)}
            </h2>
          </div>
        </div>
        <span className={cn("text-h2 font-semibold leading-none", tone.text)}>{readiness.score}%</span>
      </div>
      <div className={cn("mt-4 h-2 overflow-hidden rounded-full", tone.track)}>
        <div className={cn("h-full rounded-full transition-all", tone.bar)} style={{ width: `${readiness.score}%` }} />
      </div>
      <span className="mt-3 inline-flex items-center gap-2 text-body-sm font-semibold text-wa-blue-600">
        راجع التفاصيل
        <ArrowRight className="size-4 rotate-180" aria-hidden="true" />
      </span>
    </Link>
  );
}
