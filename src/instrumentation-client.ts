// FILE: src/instrumentation-client.ts
import * as Sentry from "@sentry/nextjs";

function scrubHeaders(headers: Record<string, string> | undefined): void {
  if (!headers) return;

  delete headers.authorization;
  delete headers.Authorization;
  delete headers.cookie;
  delete headers.Cookie;
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production" && Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  beforeSend(event) {
    scrubHeaders(event.request?.headers);
    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
