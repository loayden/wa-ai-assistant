// FILE: src/lib/utils/rateLimit.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Auth endpoints need a dependency-free fallback limiter so local and
 * Render deployments have abuse protection before adding a distributed store.
 *
 * @WARNING: This rate limiter uses a module-level in-memory Map.
 * On serverless or PaaS environments (like Render/Vercel), state is wiped on
 * every deployment or cold start, rendering rate limiting ineffective across restarts.
 * TODO: Migrate to Redis (e.g., Upstash) or Supabase for distributed rate limiting.
 */
import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";

if (appEnv.NODE_ENV === "production") {
  logger.warn("rateLimit", "Using in-memory rate limiter in production. State will be lost on restart.");
}

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

export type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
  context: string;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterSeconds: number;
};

const buckets = new Map<string, RateLimitBucket>();

function pruneExpiredBuckets(now: number): void {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function clearRateLimitBuckets(): void {
  buckets.clear();
}

export function getRequestRateLimitKey(request: Request, scope: string): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const identity = forwardedFor || realIp || "unknown";

  return `${scope}:${identity}`;
}

export function checkRateLimit(options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  pruneExpiredBuckets(now);

  const currentBucket = buckets.get(options.key);
  const bucket =
    currentBucket && currentBucket.resetAt > now
      ? currentBucket
      : {
          count: 0,
          resetAt: now + options.windowMs,
        };

  bucket.count += 1;
  buckets.set(options.key, bucket);

  const remaining = Math.max(options.limit - bucket.count, 0);
  const retryAfterSeconds = Math.max(Math.ceil((bucket.resetAt - now) / 1000), 0);

  if (bucket.count > options.limit) {
    logger.warn(options.context, "Rate limit exceeded.", {
      key: options.key,
      limit: options.limit,
      retryAfterSeconds,
    });

    return {
      allowed: false,
      remaining,
      resetAt: new Date(bucket.resetAt),
      retryAfterSeconds,
    };
  }

  return {
    allowed: true,
    remaining,
    resetAt: new Date(bucket.resetAt),
    retryAfterSeconds,
  };
}
