"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";

import { BrandLogo } from "@/components/shared/BrandLogo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

function normalizeNextPath(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/whatsapp";
  }

  return next;
}

function buildLoginRedirect(errorCode: string) {
  const search = new URLSearchParams({
    authError: errorCode,
    next: "/whatsapp",
  });

  return `/login?${search.toString()}`;
}

export function AuthConfirmClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const supabase = createClient();
    const nextPath = normalizeNextPath(searchParams.get("next"));
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type") as EmailOtpType | null;
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    let active = true;

    async function finishAuth() {
      try {
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            throw error;
          }
        } else if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type,
          });

          if (error) {
            throw error;
          }
        } else {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (!session) {
            router.replace(buildLoginRedirect("confirmation_required"));
            return;
          }
        }

        if (!active) {
          return;
        }

        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
        router.replace(nextPath);
      } catch {
        if (!active) {
          return;
        }

        router.replace(buildLoginRedirect("confirmation_failed"));
      }
    }

    void finishAuth();

    return () => {
      active = false;
    };
  }, [router, searchParams]);

  return (
    <Card className="w-full max-w-[420px] rounded-2xl border-wa-gray-100 bg-white p-8">
      <CardHeader className="items-center p-0 text-center">
        <BrandLogo className="mb-6" layout="stacked" wordmarkSize="md" />
        <CardTitle className="text-h1 font-medium text-wa-gray-900">Confirming your email</CardTitle>
        <CardDescription className="mt-2 text-body text-wa-gray-600">
          We are finishing your secure sign-in and will continue to WhatsApp setup automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 pt-8">
        <div className="h-2 overflow-hidden rounded-full bg-wa-gray-100">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-wa-blue-600" />
        </div>
      </CardContent>
    </Card>
  );
}
