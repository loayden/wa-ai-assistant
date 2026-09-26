"use client";

import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

type RouteErrorStateProps = {
  title?: string;
  description?: string;
  reset?: () => void;
  homeHref?: string;
};

export function RouteErrorState({
  title = "حدث خطأ تقني",
  description = "لم نتمكن من فتح هذا الجزء من التطبيق. جرّب مرة أخرى أو ارجع للصفحة الرئيسية.",
  reset,
  homeHref = "/dashboard",
}: RouteErrorStateProps) {
  return (
    <section className="flex min-h-[420px] items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-[560px] rounded-[28px] border border-wa-gray-100 bg-white p-6 text-center shadow-[0_24px_80px_rgba(4,44,83,0.10)] sm:p-8">
        <div className="mx-auto flex size-14 items-center justify-center rounded-3xl bg-wa-error-bg text-wa-error">
          <AlertTriangle className="size-7" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-[26px] font-semibold leading-tight text-wa-gray-900 sm:text-[32px]">{title}</h1>
        <p className="mx-auto mt-3 max-w-[420px] text-body-sm leading-7 text-wa-gray-600 sm:text-body">{description}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {reset ? (
            <Button className="rounded-full" onClick={reset}>
              <RefreshCw className="size-4" aria-hidden="true" />
              حاول مرة أخرى
            </Button>
          ) : null}
          <Link
            href={homeHref}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-wa-gray-100 bg-white px-5 text-body-sm font-semibold text-wa-gray-700 transition hover:bg-wa-gray-50 sm:min-h-14 sm:text-body"
          >
            <Home className="size-4" aria-hidden="true" />
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </section>
  );
}
