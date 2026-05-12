// FILE: src/lib/api/auth-handlers.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: The exact `/api/auth` route and catch-all `/api/auth/*` route share
 * one dispatcher so cookie-backed Supabase auth behaves consistently.
 */
import "server-only";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { ensureAppUser, requireAuthenticatedUser, UnauthorizedError } from "@/lib/api/auth";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess, jsonValidationError } from "@/lib/api/response";
import { loginSchema, signupSchema } from "@/lib/validators/auth";
import { logger } from "@/lib/utils/logger";
import { checkRateLimit } from "@/lib/utils/rateLimit";

const authActionSchema = z.object({
  action: z.enum(["login", "signup", "logout"]),
});
const AUTH_RATE_LIMIT = 5;
const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

type AuthAction = z.infer<typeof authActionSchema>["action"];

function isObfuscatedExistingUserResponse(data: {
  user: { identities?: ArrayLike<unknown> | null } | null;
  session: unknown;
}): boolean {
  return !data.session && !!data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0;
}

async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function resolveAction(pathAction: string | undefined, body: unknown): AuthAction | null {
  if (pathAction === "login" || pathAction === "signup" || pathAction === "logout") {
    return pathAction;
  }

  const parsed = authActionSchema.safeParse(body);
  return parsed.success ? parsed.data.action : null;
}

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

function getAuthRateLimitKey(request: Request, action: AuthAction, body: unknown): string {
  const email =
    body && typeof body === "object" && "email" in body && typeof body.email === "string"
      ? body.email.toLowerCase().trim()
      : "unknown-email";

  return `auth:${action}:${getClientIp(request)}:${email}`;
}

function enforceAuthRateLimit(request: Request, action: AuthAction, body: unknown) {
  if (action === "logout") {
    return null;
  }

  /*
   * [ROLE: BACKEND ENGINEER]
   * Decision: Login and signup attempts are limited by action, client IP, and
   * email so repeated credential attempts receive a deterministic 429 response.
   */
  const rateLimit = checkRateLimit({
    key: getAuthRateLimitKey(request, action, body),
    limit: AUTH_RATE_LIMIT,
    windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
    context: "api.auth",
  });

  if (rateLimit.allowed) {
    return null;
  }

  return jsonError("Too many authentication attempts. Please retry later.", 429, {
    retryAfterSeconds: rateLimit.retryAfterSeconds,
    resetAt: rateLimit.resetAt.toISOString(),
  });
}

export async function handleAuthPost(request: Request, pathAction?: string) {
  const body = await readJsonBody(request);
  const action = resolveAction(pathAction, body);

  if (!action) {
    return jsonError("Auth action must be one of login, signup, or logout.", 422);
  }

  const rateLimitResponse = enforceAuthRateLimit(request, action, body);

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const supabase = createClient();

    if (action === "signup") {
      const parsed = signupSchema.safeParse(body);

      if (!parsed.success) {
        return jsonValidationError(parsed.error);
      }

      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          data: {
            full_name: parsed.data.fullName,
          },
        },
      });

      if (error) {
        return jsonError(error.message, 400);
      }

      /*
       * [ROLE: BACKEND ENGINEER]
       * Decision: Supabase can return an obfuscated user object instead of an
       * explicit duplicate-email error when confirm email/phone is enabled.
       * Detect that shape before syncing Prisma to avoid surfacing a 500.
       */
      if (isObfuscatedExistingUserResponse(data)) {
        return jsonError("An account with this email already exists. Please log in.", 409);
      }

      if (data.user) {
        await ensureAppUser(data.user);
      }

      return jsonSuccess({
        user: data.user ? { id: data.user.id, email: data.user.email } : null,
        requiresEmailVerification: !data.session,
      });
    }

    if (action === "login") {
      const parsed = loginSchema.safeParse(body);

      if (!parsed.success) {
        return jsonValidationError(parsed.error);
      }

      const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

      if (error || !data.user) {
        return jsonError(error?.message ?? "Invalid login credentials.", 401);
      }

      const user = await ensureAppUser(data.user);

      return jsonSuccess({
        user: {
          id: user.id,
          email: user.email,
          planTier: user.planTier,
          subscriptionStatus: user.subscriptionStatus,
        },
      });
    }

    await requireAuthenticatedUser();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return jsonError(error.message, 400);
    }

    return jsonSuccess({ signedOut: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(error.message, 401);
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.auth", error);

    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }

    logger.error("api.auth", "Auth route failed.", { error, action });
    return jsonError("Auth request failed.", 500);
  }
}
