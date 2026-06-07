// FILE: src/lib/security/cron.ts
/*
 * [ROLE: SECURITY ENGINEER]
 * Decision: Cron endpoints share one timing-safe authorization check so
 * production jobs cannot run without an explicit secret.
 */
import { timingSafeEqual } from "crypto";

import { appEnv } from "@/lib/utils/env";

function timingSafeStringEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function isAuthorizedCronRequest(
  request: Request,
  options: {
    secret?: string;
    nodeEnv?: "development" | "test" | "production";
  } = {},
): boolean {
  const hasSecretOverride = Object.prototype.hasOwnProperty.call(options, "secret");
  const secret = hasSecretOverride ? options.secret : appEnv.CRON_SECRET;
  const nodeEnv = options.nodeEnv ?? appEnv.NODE_ENV;

  if (!secret) {
    return nodeEnv !== "production";
  }

  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return false;
  }

  const providedSecret = authorization.slice("Bearer ".length).trim();

  return timingSafeStringEqual(providedSecret, secret);
}
