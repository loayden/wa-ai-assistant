// FILE: src/components/whatsapp/EmbeddedSignupLauncher.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Meta's hosted signup flow is the default onboarding path because
 * it removes technical identifiers from the customer journey and lets the app
 * finish connection setup automatically after the popup completes.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, MessageSquareLock, Smartphone } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { apiData, ApiClientError } from "@/lib/api/client";

type EmbeddedSignupLauncherProps = {
  appId: string | null;
  configurationId: string | null;
  apiVersion: string;
  onConnected: () => void;
};

type EmbeddedSignupEvent = {
  event: "FINISH" | "FINISH_ONLY_WABA" | "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING" | "CANCEL";
  phoneNumberId: string;
  businessAccountId: string;
};

type LaunchState = "idle" | "authorizing" | "finalizing";

type EmbeddedSignupResponse = {
  connection: {
    id: string;
  };
};

const FACEBOOK_SDK_ID = "facebook-jssdk";

function isAllowedOrigin(origin: string): boolean {
  return origin === "https://www.facebook.com" || origin === "https://web.facebook.com" || origin === "https://m.facebook.com";
}

export function EmbeddedSignupLauncher({
  apiVersion,
  appId,
  configurationId,
  onConnected,
}: EmbeddedSignupLauncherProps) {
  const [sdkReady, setSdkReady] = useState(false);
  const [launchState, setLaunchState] = useState<LaunchState>("idle");
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [pendingEvent, setPendingEvent] = useState<EmbeddedSignupEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const embeddedSignupEnabled = useMemo(() => Boolean(appId && configurationId), [appId, configurationId]);

  useEffect(() => {
    if (!embeddedSignupEnabled) {
      return;
    }

    const initializeFacebookSdk = () => {
      if (!window.FB || !appId) {
        return;
      }

      window.FB.init({
        appId,
        cookie: true,
        xfbml: false,
        version: apiVersion,
      });

      setSdkReady(true);
    };

    if (window.FB) {
      initializeFacebookSdk();
      return;
    }

    window.fbAsyncInit = initializeFacebookSdk;

    if (!document.getElementById(FACEBOOK_SDK_ID)) {
      const script = document.createElement("script");
      script.id = FACEBOOK_SDK_ID;
      script.async = true;
      script.defer = true;
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      script.onerror = () => setError("Meta login could not be loaded. Refresh and try again.");
      document.body.appendChild(script);
    }
  }, [apiVersion, appId, embeddedSignupEnabled]);

  useEffect(() => {
    const listener = (event: MessageEvent<string>) => {
      if (!isAllowedOrigin(event.origin) || typeof event.data !== "string") {
        return;
      }

      try {
        const payload = JSON.parse(event.data) as {
          type?: string;
          event?: string;
          data?: { phone_number_id?: string; waba_id?: string; current_step?: string };
        };

        if (payload.type !== "WA_EMBEDDED_SIGNUP") {
          return;
        }

        if (
          (payload.event === "FINISH" ||
            payload.event === "FINISH_ONLY_WABA" ||
            payload.event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING") &&
          payload.data?.phone_number_id &&
          payload.data?.waba_id
        ) {
          setPendingEvent({
            event: payload.event,
            phoneNumberId: payload.data.phone_number_id,
            businessAccountId: payload.data.waba_id,
          });
          setLaunchState("finalizing");
          setError(null);
          return;
        }

        if (payload.event === "CANCEL") {
          setLaunchState("idle");
          setError(payload.data?.current_step ? `Meta signup was cancelled during ${payload.data.current_step}.` : "Meta signup was cancelled.");
        }
      } catch {
        // Ignore non-JSON chatter from the popup.
      }
    };

    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, []);

  useEffect(() => {
    if (!pendingCode || !pendingEvent) {
      return;
    }

    let active = true;
    const eventPayload = pendingEvent;
    const authorizationCode = pendingCode;

    async function finalizeConnection() {
      try {
        await apiData<EmbeddedSignupResponse>("/api/whatsapp/embedded-signup", {
          method: "POST",
          body: JSON.stringify({
            code: authorizationCode,
            phoneNumberId: eventPayload.phoneNumberId,
            businessAccountId: eventPayload.businessAccountId,
            event: eventPayload.event,
          }),
        });

        if (!active) {
          return;
        }

        setPendingCode(null);
        setPendingEvent(null);
        setLaunchState("idle");
        setError(null);
        onConnected();
      } catch (requestError) {
        if (!active) {
          return;
        }

        const message =
          requestError instanceof ApiClientError
            ? requestError.message
            : "Meta connected successfully, but kallem could not finish the secure handoff.";

        setError(message);
        setLaunchState("idle");
      }
    }

    void finalizeConnection();

    return () => {
      active = false;
    };
  }, [onConnected, pendingCode, pendingEvent]);

  function launchEmbeddedSignup() {
    if (!embeddedSignupEnabled || !sdkReady || !window.FB || !configurationId) {
      setError("Meta one-click onboarding is not configured yet for this environment.");
      return;
    }

    setError(null);
    setPendingCode(null);
    setPendingEvent(null);
    setLaunchState("authorizing");

    window.FB.login(
      (response) => {
        const code = response.authResponse?.code;

        if (!code) {
          setLaunchState("idle");
          setError("Meta sign-in was cancelled before permissions were granted.");
          return;
        }

        setPendingCode(code);
      },
      {
        config_id: configurationId,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          feature: "whatsapp_embedded_signup",
          sessionInfoVersion: 3,
        },
      },
    );
  }

  return (
    <div className="rounded-xl border border-wa-gray-100 bg-white p-5">
      <p className="text-label font-medium uppercase tracking-widest text-wa-gray-400">Recommended</p>
      <h2 className="mt-3 text-h2 font-medium text-wa-gray-900">Connect with Meta</h2>
      <p className="mt-2 max-w-[32rem] text-body text-wa-gray-600">
        No IDs, tokens, or developer settings. Sign in with Meta, choose your business, and kallem will finish the secure setup automatically.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-wa-gray-100 bg-wa-gray-50 p-4">
          <MessageSquareLock className="size-5 text-wa-blue-600" aria-hidden="true" />
          <p className="mt-3 text-body-sm font-medium text-wa-gray-900">No technical setup</p>
          <p className="mt-1 text-body-sm text-wa-gray-600">Your customer never sees Phone Number IDs or access tokens.</p>
        </div>
        <div className="rounded-xl border border-wa-gray-100 bg-wa-gray-50 p-4">
          <Smartphone className="size-5 text-wa-blue-600" aria-hidden="true" />
          <p className="mt-3 text-body-sm font-medium text-wa-gray-900">Use the same number</p>
          <p className="mt-1 text-body-sm text-wa-gray-600">Meta handles the number verification steps inside the popup.</p>
        </div>
        <div className="rounded-xl border border-wa-gray-100 bg-wa-gray-50 p-4">
          <CheckCircle2 className="size-5 text-wa-blue-600" aria-hidden="true" />
          <p className="mt-3 text-body-sm font-medium text-wa-gray-900">Webhook wired for you</p>
          <p className="mt-1 text-body-sm text-wa-gray-600">kallem stores the connection securely and subscribes the account automatically.</p>
        </div>
      </div>
      {error ? (
        <Alert className="mt-5 border-wa-error bg-wa-error-bg text-wa-error">
          <AlertTitle>Meta onboarding needs attention</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {!embeddedSignupEnabled ? (
        <Alert className="mt-5 border-wa-warning bg-wa-warning-bg text-wa-warning">
          <AlertTitle>One-click Meta onboarding is not configured yet</AlertTitle>
          <AlertDescription>Add your Meta Embedded Signup configuration ID to enable this button, or use the advanced API credentials flow below.</AlertDescription>
        </Alert>
      ) : null}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button className="sm:min-w-[220px]" isLoading={launchState !== "idle"} onClick={launchEmbeddedSignup}>
          {launchState === "idle" ? "Continue with Meta" : launchState === "authorizing" ? "Waiting for Meta…" : "Finishing secure setup…"}
        </Button>
        <p className="text-body-sm text-wa-gray-600">Allow the popup and complete Meta’s guided steps. If you already use WhatsApp Business App, Meta may offer to keep that same number.</p>
      </div>
    </div>
  );
}
