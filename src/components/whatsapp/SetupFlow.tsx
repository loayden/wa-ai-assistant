// FILE: src/components/whatsapp/SetupFlow.tsx
"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: The setup screen is centered on Meta Embedded Signup so normal
 * businesses never need IDs or tokens, while manual credentials remain
 * available as an advanced fallback for internal or recovery use.
 */
import { useState } from "react";
import dynamic from "next/dynamic";

import { BrandLogo } from "@/components/shared/BrandLogo";
import { EmbeddedSignupLauncher } from "@/components/whatsapp/EmbeddedSignupLauncher";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BRAND_NAME } from "@/lib/utils/brand";

interface SetupFlowProps {
  appId: string | null;
  appUrl: string;
  configurationId: string | null;
  apiVersion: string;
  mockMode: boolean;
  onConnected: () => void;
}

const ConnectForm = dynamic(
  () => import("@/components/whatsapp/ConnectForm").then((module) => module.ConnectForm),
  { ssr: false },
);

function normalizeOwnerPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (!digits) {
    return undefined;
  }

  if (digits.startsWith("20") && digits.length > 10) {
    return digits;
  }

  if (digits.startsWith("0") && digits.length >= 10) {
    return `20${digits.slice(1)}`;
  }

  return digits;
}

export function SetupFlow({ apiVersion, appId, appUrl, configurationId, mockMode, onConnected }: SetupFlowProps) {
  const embeddedSignupAvailable = !mockMode && Boolean(appId && configurationId);
  const [advancedOpen, setAdvancedOpen] = useState(!embeddedSignupAvailable);
  const [ownerPhoneNumber, setOwnerPhoneNumber] = useState("");

  return (
    <div className="mx-auto max-w-[720px] space-y-5 px-4 pt-12">
      <div className="mx-auto max-w-[460px] text-center">
        <BrandLogo className="mb-8" layout="stacked" wordmarkSize="md" />
        <h1 className="text-h1 font-medium text-wa-gray-900">Connect WhatsApp</h1>
        <p className="mt-3 text-body text-wa-gray-600">
          The easiest path is Meta’s own guided onboarding. Your customer signs in, chooses the business, verifies the number, and {BRAND_NAME} completes the secure setup automatically.
        </p>
      </div>
      {mockMode ? (
        <Alert className="border-wa-warning bg-wa-warning-bg text-wa-warning">
          <AlertTitle>Mock Mode Active</AlertTitle>
          <AlertDescription>One-click Meta onboarding is disabled in mock mode. Use the advanced credentials flow below for local testing.</AlertDescription>
        </Alert>
      ) : embeddedSignupAvailable ? (
        <EmbeddedSignupLauncher
          apiVersion={apiVersion}
          appId={appId}
          configurationId={configurationId}
          onConnected={onConnected}
        />
      ) : (
        <Alert className="border-wa-warning bg-wa-warning-bg text-wa-warning">
          <AlertTitle>Meta one-click onboarding is not configured yet</AlertTitle>
          <AlertDescription>Use the secure assisted credentials flow below in this environment. When the Meta configuration ID is added, the popup onboarding button will appear here automatically.</AlertDescription>
        </Alert>
      )}
      <div className="rounded-xl border border-wa-gray-100 bg-white p-5">
        {embeddedSignupAvailable ? (
          <button className="text-body-sm font-medium text-wa-blue-600" type="button" onClick={() => setAdvancedOpen((current) => !current)}>
            Use API credentials instead →
          </button>
        ) : (
          <p className="text-body-sm font-medium text-wa-gray-900">Continue with API credentials</p>
        )}
        {advancedOpen ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl bg-wa-warning-bg p-4 text-body-sm text-wa-warning">
              This path is for internal testing, migrations, or recovery. Business customers should use the Meta button above.
            </div>
            <div className="space-y-2">
              <label className="block text-body-sm font-medium text-wa-gray-800" htmlFor="ownerPhoneNumber">
                Business phone number (optional)
              </label>
              <Input
                id="ownerPhoneNumber"
                inputMode="tel"
                placeholder="+20 11 4499 9221"
                value={ownerPhoneNumber}
                onChange={(event) => setOwnerPhoneNumber(event.target.value)}
              />
              <p className="text-body-sm text-wa-gray-600">
                Save this only if you want owner commands like <code>stop</code> and <code>resume</code> to map cleanly to the connected business number.
              </p>
            </div>
            <ConnectForm
              mockMode={mockMode}
              onConnected={onConnected}
              ownerPhoneNumber={normalizeOwnerPhone(ownerPhoneNumber)}
            />
          </div>
        ) : null}
      </div>
      <div className="rounded-xl border border-wa-gray-100 bg-wa-gray-50 p-5">
        <p className="text-body-sm font-medium text-wa-gray-900">What your customer will need</p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-body-sm text-wa-gray-600">
          <li>A Meta account with access to the business that owns the number.</li>
          <li>The WhatsApp number they want to connect.</li>
          <li>Permission to complete Meta’s verification steps in the popup.</li>
        </ul>
        <p className="mt-3 text-body-sm text-wa-gray-600">They do not need Phone Number IDs, WABA IDs, or access tokens.</p>
        <p className="mt-2 text-body-sm text-wa-gray-500">Webhook target: {appUrl.replace(/\/$/, "")}/api/webhooks/whatsapp</p>
      </div>
    </div>
  );
}
