// FILE: src/lib/utils/rateLimit.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Auth endpoints need a dependency-free fallback limiter so local and
 * Render deployments have abuse protection before adding a distributed store.
 */
import { logger } from "@/lib/utils/logger";

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
