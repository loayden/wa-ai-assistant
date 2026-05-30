import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { ensureAppUser } from "@/lib/api/auth";
import { normalizeAuthNextPath } from "@/lib/auth/redirect-url";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildRedirectUrl(request: Request, path: string) {
  return new URL(path, request.url);
}

function buildLoginRedirect(request: Request, errorCode: string, nextPath: string, errorDescription?: string) {
  const redirectUrl = buildRedirectUrl(request, "/login");

  redirectUrl.searchParams.set("authError", errorCode);
  redirectUrl.searchParams.set("next", nextPath);

  if (errorDescription) {
    redirectUrl.searchParams.set("authReason", errorDescription);
  }

  return redirectUrl;
}

function isEmailOtpType(type: string | null): type is EmailOtpType {
  return type === "signup" || type === "invite" || type === "magiclink" || type === "recovery" || type === "email_change" || type === "email";
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const nextPath = normalizeAuthNextPath(requestUrl.searchParams.get("next"));
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const providerError = requestUrl.searchParams.get("error") ?? requestUrl.searchParams.get("error_code");
  const providerErrorDescription = requestUrl.searchParams.get("error_description") ?? requestUrl.searchParams.get("error_reason");

  if (providerError || providerErrorDescription) {
    return NextResponse.redirect(buildLoginRedirect(request, "oauth_provider_error", nextPath, providerErrorDescription ?? providerError ?? undefined));
  }

  try {
    const supabase = await createClient();

    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        throw error;
      }

      if (data.user) {
        await ensureAppUser(data.user);
      }

      return NextResponse.redirect(buildRedirectUrl(request, nextPath));
    }

    if (tokenHash && isEmailOtpType(type)) {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        await ensureAppUser(data.user);
      }

      return NextResponse.redirect(buildRedirectUrl(request, nextPath));
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      await ensureAppUser(session.user);
      return NextResponse.redirect(buildRedirectUrl(request, nextPath));
    }

    return NextResponse.redirect(buildLoginRedirect(request, "confirmation_required", nextPath));
  } catch (error) {
    const message = error instanceof Error ? error.message : undefined;

    logger.warn("auth.callback", "Failed to complete Supabase auth callback.", {
      error: message,
      hasCode: Boolean(code),
      hasTokenHash: Boolean(tokenHash),
      type,
    });

    return NextResponse.redirect(buildLoginRedirect(request, "confirmation_failed", nextPath, message));
  }
}
