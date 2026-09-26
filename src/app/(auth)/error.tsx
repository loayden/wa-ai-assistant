"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import { RouteErrorState } from "@/components/shared/RouteErrorState";

export default function AuthError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <RouteErrorState
      title="تعذر فتح صفحة الدخول"
      description="حدث خطأ أثناء تحميل نموذج الحساب. حاول مرة أخرى أو ارجع للرئيسية."
      reset={reset}
      homeHref="/"
    />
  );
}
