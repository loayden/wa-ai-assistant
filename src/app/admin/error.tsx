"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import { RouteErrorState } from "@/components/shared/RouteErrorState";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <RouteErrorState
      title="تعذر فتح لوحة الإدارة"
      description="فشل تحميل هذا الجزء من لوحة الإدارة. أعد المحاولة أو ارجع للتطبيق."
      reset={reset}
      homeHref="/dashboard"
    />
  );
}
