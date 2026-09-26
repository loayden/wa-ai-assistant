// FILE: src/app/global-error.tsx
"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import { RouteErrorState } from "@/components/shared/RouteErrorState";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ar" dir="rtl" className="h-full">
      <body className="min-h-full bg-wa-gray-50">
        <main className="app-glass-background min-h-screen p-4 text-wa-gray-900">
          <RouteErrorState
            title="حدث خطأ غير متوقع"
            description="تعذر تحميل التطبيق بالكامل. حاول مرة أخرى، أو ارجع للرئيسية ثم افتح الصفحة من جديد."
            reset={reset}
            homeHref="/"
          />
        </main>
      </body>
    </html>
  );
}
