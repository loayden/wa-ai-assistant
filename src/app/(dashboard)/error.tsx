"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import { RouteErrorState } from "@/components/shared/RouteErrorState";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return <RouteErrorState reset={reset} />;
}
