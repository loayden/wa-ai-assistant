"use client";

import type { Provider } from "@supabase/supabase-js";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { buildOAuthRedirectUrl, normalizeAuthNextPath } from "@/lib/auth/redirect-url";
import { sendMarketingEvent } from "@/lib/marketing/client-events";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type SocialProvider = "google" | "facebook";

const providerConfig: Record<
  SocialProvider,
  {
    buttonClassName: string;
    iconClassName: string;
    iconLabel: string;
    label: string;
    queryParams?: Record<string, string>;
    scopes?: string;
  }
> = {
  google: {
    label: "المتابعة بحساب Google",
    iconLabel: "G",
    iconClassName: "bg-white text-[#1A73E8] ring-1 ring-wa-gray-200",
    buttonClassName: "hover:border-[#DADCE0] hover:bg-white",
    queryParams: { prompt: "select_account" },
  },
  facebook: {
    label: "المتابعة بحساب Facebook",
    iconLabel: "f",
    iconClassName: "bg-[#1877F2] text-white",
    buttonClassName: "hover:border-[#1877F2] hover:bg-[#F0F6FF]",
    scopes: "public_profile",
  },
};

export function SocialAuthButtons({
  className,
  mode = "login",
  nextPath = "/connect",
}: {
  className?: string;
  mode?: "login" | "signup";
  nextPath?: string | null;
}) {
  const [loadingProvider, setLoadingProvider] = useState<SocialProvider | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSocialAuth(provider: SocialProvider) {
    setErrorMessage(null);
    setLoadingProvider(provider);

    try {
      const supabase = createClient();
      const config = providerConfig[provider];
      const redirectTo = buildOAuthRedirectUrl(window.location.origin, normalizeAuthNextPath(nextPath));

      sendMarketingEvent("social_auth_start", {
        label: `${mode}_${provider}`,
        source: "social_auth_buttons",
        target: redirectTo,
      });

      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider as Provider,
        options: {
          redirectTo,
          queryParams: config.queryParams,
          scopes: config.scopes,
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      setLoadingProvider(null);
      setErrorMessage(error instanceof Error ? error.message : "تعذر فتح تسجيل الدخول الاجتماعي. حاولي مرة أخرى.");
    }
  }

  return (
    <div className={cn("grid gap-3", className)}>
      {errorMessage ? (
        <Alert className="border-wa-error bg-wa-error-bg">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      {(Object.keys(providerConfig) as SocialProvider[]).map((provider) => {
        const config = providerConfig[provider];

        return (
          <Button
            key={provider}
            className={cn("w-full rounded-full border-wa-gray-200 bg-white text-wa-gray-800", config.buttonClassName)}
            isLoading={loadingProvider === provider}
            onClick={() => void handleSocialAuth(provider)}
            type="button"
            variant="outline"
          >
            <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full text-base font-bold", config.iconClassName)}>
              {config.iconLabel}
            </span>
            {config.label}
          </Button>
        );
      })}

      {mode === "signup" ? (
        <p className="text-center text-xs leading-5 text-wa-gray-500">
          بالاستمرار عبر Google أو Facebook فأنت توافق على شروط الاستخدام وسياسة الخصوصية.
        </p>
      ) : null}
    </div>
  );
}
