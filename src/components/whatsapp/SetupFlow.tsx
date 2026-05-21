"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: The setup surface leads with the working manual Meta flow while
 * keeping embedded signup optional and secondary when it is actually enabled.
 */
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Bot, Building2, CheckCircle2, KeyRound, LockKeyhole, MessageSquareText, RadioTower, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { BRAND_NAME } from "@/lib/utils/brand";
import { EmbeddedSignupLauncher } from "@/components/whatsapp/EmbeddedSignupLauncher";

interface SetupFlowProps {
  appId: string | null;
  appUrl: string;
  configurationId: string | null;
  embeddedSignupEnabled: boolean;
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

export function SetupFlow({
  apiVersion,
  appId,
  appUrl,
  configurationId,
  embeddedSignupEnabled,
  mockMode,
  onConnected,
}: SetupFlowProps) {
  const embeddedSignupAvailable = !mockMode && embeddedSignupEnabled && Boolean(appId && configurationId);
  const [ownerPhoneNumber, setOwnerPhoneNumber] = useState("");
  const webhookUrl = useMemo(() => `${appUrl.replace(/\/$/, "")}/api/webhooks/whatsapp`, [appUrl]);

  return (
    <div className="mx-auto max-w-[1120px] space-y-4 px-3 pb-8 pt-4 sm:space-y-6 sm:px-6 sm:pt-8">
      <section className="overflow-hidden rounded-[22px] border border-wa-gray-100 bg-white shadow-[0_18px_56px_rgba(13,20,33,0.05)] sm:rounded-[32px]">
        <div className="grid gap-4 p-4 sm:gap-6 sm:p-8 lg:grid-cols-[1fr_0.74fr] lg:items-end">
          <div>
            <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">WhatsApp setup</p>
            <h1 className="mt-2 max-w-[640px] text-[28px] font-semibold leading-tight text-wa-gray-900 sm:mt-3 sm:text-[54px] sm:leading-[1.06]">
              Connect the business number customers already use.
            </h1>
            <p className="mt-3 max-w-[680px] text-body-sm leading-6 text-wa-gray-600 sm:mt-5 sm:text-body-lg">
              {BRAND_NAME} verifies the Meta details before saving them, keeps the token encrypted, and uses the same
              connection for AI replies and conversation tracking.
            </p>
          </div>
          <div className="rounded-[20px] border border-wa-blue-100 bg-wa-blue-50 p-4 sm:rounded-[26px] sm:p-5">
            <p className="text-body-sm font-semibold text-wa-blue-600">Reliable setup path</p>
            <p className="mt-2 text-body-sm leading-6 text-wa-gray-700">
              Meta one-click signup requires BSP or Tech Provider eligibility. This page uses the working API credential
              setup and explains every field in business language.
            </p>
            <div className="mt-4 grid gap-2">
              {["Verified before saving", "Encrypted after validation", "Webhook prepared automatically"].map((item) => (
                <div key={item} className="flex items-center gap-2 text-body-sm font-medium text-wa-gray-800">
                  <CheckCircle2 className="size-4 shrink-0 text-wa-blue-600" aria-hidden="true" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {mockMode ? (
        <Alert className="border-wa-warning bg-wa-warning-bg text-wa-warning">
          <AlertTitle>Mock Mode Active</AlertTitle>
          <AlertDescription>This environment skips real WhatsApp sends, but the setup flow below stays the same.</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-[1.32fr_0.68fr]">
        <div className="space-y-4 sm:space-y-5">
          <section className="rounded-[22px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px] sm:p-5">
            <div className="grid gap-2.5 sm:grid-cols-3 sm:gap-3">
              <StepSummary
                icon={RadioTower}
                step="1. Business number"
                description="Identify the WhatsApp number this assistant should control."
              />
              <StepSummary
                icon={KeyRound}
                step="2. Meta details"
                description="Paste the Phone Number ID, Business Account ID, and access token from Meta."
              />
              <StepSummary
                icon={ShieldCheck}
                step="3. Verify and save"
                description="kallem validates the account, prepares the webhook, and stores the token securely."
              />
            </div>
          </section>

          <section className="rounded-[22px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px] sm:p-5">
            <div className="space-y-2">
              <p className="text-body-sm font-semibold text-wa-gray-900">Owner phone number <span className="font-medium text-wa-gray-400">(optional)</span></p>
              <p className="text-body-sm text-wa-gray-600">
                Save the owner&apos;s phone only if you want owner commands like <code>stop</code> and <code>resume</code> to map
                cleanly to the connected business number.
              </p>
              <Input
                id="ownerPhoneNumber"
                inputMode="tel"
                placeholder="+20 11 4499 9221"
                value={ownerPhoneNumber}
                onChange={(event) => setOwnerPhoneNumber(event.target.value)}
              />
            </div>
          </section>

          <ConnectForm mockMode={mockMode} onConnected={onConnected} ownerPhoneNumber={normalizeOwnerPhone(ownerPhoneNumber)} />

          {embeddedSignupAvailable ? (
            <details className="rounded-2xl border border-wa-gray-100 bg-white p-4 sm:p-5">
              <summary className="cursor-pointer text-body-sm font-medium text-wa-blue-600">Use Meta guided onboarding instead</summary>
              <div className="mt-4 space-y-4">
                <div className="rounded-xl bg-wa-gray-50 p-4 text-body-sm text-wa-gray-600">
                  This environment also supports Meta&apos;s guided popup. The manual setup above is still the most direct and
                  explicit path if you already have the credentials open in Meta.
                </div>
                <EmbeddedSignupLauncher
                  apiVersion={apiVersion}
                  appId={appId}
                  configurationId={configurationId}
                  onConnected={onConnected}
                />
              </div>
            </details>
          ) : null}
        </div>

        <aside className="space-y-5">
          <section className="rounded-[22px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px] sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-wa-blue-50 text-wa-blue-600 sm:size-10 sm:rounded-2xl">
                <Building2 className="size-4 sm:size-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-body-sm font-semibold text-wa-gray-900">What the business needs</p>
                <div className="mt-3 space-y-3">
                  {[
                    "Access to the Meta app that owns the WhatsApp number.",
                    "The Phone Number ID and WhatsApp Business Account ID from Meta.",
                    "An access token with WhatsApp Business permissions.",
                  ].map((item) => (
                    <p key={item} className="flex gap-2 text-body-sm leading-6 text-wa-gray-600">
                      <CheckCircle2 className="mt-1 size-4 shrink-0 text-wa-blue-600" aria-hidden="true" />
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[22px] border border-wa-blue-100 bg-wa-blue-50 p-4 sm:rounded-[28px] sm:p-5">
            <LockKeyhole className="size-5 text-wa-blue-600 sm:size-6" aria-hidden="true" />
            <p className="mt-4 text-body-sm font-semibold text-wa-gray-900">Why this setup is safe</p>
            <p className="mt-2 text-body-sm leading-6 text-wa-gray-700">
              The app checks the number and account first, stores the token encrypted only after verification succeeds, and
              prepares the webhook so the inbox can start receiving messages.
            </p>
          </section>

          <section className="rounded-[22px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px] sm:p-5">
            <Bot className="size-5 text-wa-blue-600 sm:size-6" aria-hidden="true" />
            <p className="mt-4 text-body-sm font-semibold text-wa-gray-900">What happens next</p>
            <p className="mt-2 text-body-sm text-wa-gray-600">
              After the connection is verified, you land on a status screen for this number. From there you can turn AI replies
              on, review messages, and adjust assistant behavior from one place.
            </p>
          </section>

          <section className="rounded-[22px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px] sm:p-5">
            <MessageSquareText className="size-5 text-wa-blue-600 sm:size-6" aria-hidden="true" />
            <p className="mt-4 text-body-sm font-semibold text-wa-gray-900">Webhook target</p>
            <code className="mt-3 block overflow-x-auto rounded-xl border border-wa-gray-100 bg-wa-gray-50 px-3 py-3 font-mono text-mono text-wa-gray-600">
              {webhookUrl}
            </code>
          </section>
        </aside>
      </div>
    </div>
  );
}

type StepSummaryProps = {
  icon: typeof Building2;
  step: string;
  description: string;
};

function StepSummary({ description, icon: Icon, step }: StepSummaryProps) {
  return (
    <div className="rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-3 sm:p-4">
      <div className="mb-2.5 flex size-9 items-center justify-center rounded-xl bg-white text-wa-blue-600 shadow-[0_10px_28px_rgba(13,20,33,0.05)] sm:mb-3 sm:size-10 sm:rounded-2xl">
        <Icon className="size-4" aria-hidden="true" />
      </div>
      <p className="text-body-sm font-semibold text-wa-gray-900">{step}</p>
      <p className="mt-1 text-body-sm text-wa-gray-600">{description}</p>
    </div>
  );
}
