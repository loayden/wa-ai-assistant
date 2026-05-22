// FILE: src/components/whatsapp/WhatsAppPageClient.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: WhatsApp state is driven by connection and settings queries so the
 * setup page can switch between connect, connected, and mock test states.
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bot, CheckCircle2, MessageSquareText, RadioTower, Settings2 } from "lucide-react";

import { AIToggle } from "@/components/ai/AIToggle";
import { MockMessageSender } from "@/components/messages/MockMessageSender";
import { SetupFlow } from "@/components/whatsapp/SetupFlow";
import { ConnectionStatus, type WhatsAppConnectionSummary } from "@/components/whatsapp/ConnectionStatus";
import { LiveConnectionCheck } from "@/components/whatsapp/LiveConnectionCheck";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { apiData } from "@/lib/api/client";
import type { SettingsResponse } from "@/types/api";

type WhatsAppPageClientProps = {
  appUrl: string;
  embeddedSignupAppId: string | null;
  embeddedSignupConfigId: string | null;
  embeddedSignupEnabled: boolean;
  apiVersion: string;
  initialConnection: WhatsAppConnectionSummary | null;
  initialSettings: SettingsResponse["settings"];
  mockMode: boolean;
};

export function WhatsAppPageClient({
  apiVersion,
  appUrl,
  embeddedSignupAppId,
  embeddedSignupConfigId,
  embeddedSignupEnabled,
  initialConnection,
  initialSettings,
  mockMode,
}: WhatsAppPageClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [connection, setConnection] = useState<WhatsAppConnectionSummary | null>(initialConnection);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(initialSettings.autoReplyEnabled);
  const disconnectMutation = useMutation({
    mutationFn: (connectionId: string) => apiData(`/api/whatsapp/connect?id=${connectionId}`, { method: "DELETE" }),
    onSuccess: () => {
      setConnection(null);
      void queryClient.invalidateQueries({ queryKey: ["whatsapp-connections"] });
      router.refresh();
    },
  });

  if (!connection) {
    return (
      <SetupFlow
        apiVersion={apiVersion}
        appId={embeddedSignupAppId}
        appUrl={appUrl}
        configurationId={embeddedSignupConfigId}
        embeddedSignupEnabled={embeddedSignupEnabled}
        mockMode={mockMode}
        onConnected={() => {
          void queryClient.invalidateQueries({ queryKey: ["whatsapp-connections"] });
          router.refresh();
        }}
      />
    );
  }

  const connectedFacts = [
    {
      icon: CheckCircle2,
      label: "Number verified",
      value: connection.displayName ?? "WhatsApp connected",
    },
    {
      icon: RadioTower,
      label: "Webhook ready",
      value: "Messages can enter the inbox",
    },
    {
      icon: Bot,
      label: "AI replies",
      value: autoReplyEnabled ? "Replying to customers" : "Paused by owner",
    },
  ];

  return (
    <div className="mx-auto max-w-[1120px] space-y-4 px-3 pb-8 pt-4 sm:space-y-6 sm:px-6 sm:pt-8">
      {mockMode ? (
        <Alert className="border-wa-warning bg-wa-warning-bg text-wa-warning">
          <AlertTitle>Mock Mode Active</AlertTitle>
          <AlertDescription>No real WhatsApp messages will be sent from this environment.</AlertDescription>
        </Alert>
      ) : null}

      <section className="overflow-hidden rounded-[22px] border border-wa-gray-100 bg-white shadow-[0_18px_56px_rgba(13,20,33,0.05)] sm:rounded-[32px]">
        <div className="grid gap-4 p-4 sm:gap-6 sm:p-8 lg:grid-cols-[1fr_0.78fr] lg:items-center">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <StatusBadge className="px-3 py-1" label="Connected" variant="active" />
              <StatusBadge
                className="px-3 py-1"
                label={autoReplyEnabled ? "Replying" : "Paused"}
                variant={autoReplyEnabled ? "active" : "paused"}
              />
            </div>
            <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">WhatsApp command center</p>
            <h1 className="mt-2 max-w-[640px] text-[28px] font-semibold leading-tight text-wa-gray-900 sm:mt-3 sm:text-[54px] sm:leading-[1.06]">
              Your assistant is ready for this number.
            </h1>
            <p className="mt-3 max-w-[680px] text-body-sm leading-6 text-wa-gray-600 sm:mt-5 sm:text-body-lg">
              Turn AI replies on or off, review the connection details, and keep the business number ready for customer
              conversations from one place.
            </p>
          </div>
          <div className="rounded-[20px] border border-wa-blue-100 bg-wa-blue-50 p-4 sm:rounded-[26px] sm:p-5">
            <p className="text-body-sm font-semibold text-wa-blue-600">Daily status</p>
            <div className="mt-4 grid gap-3">
              {connectedFacts.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3 rounded-2xl bg-white p-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-wa-blue-50 text-wa-blue-600">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-label font-medium uppercase tracking-widest text-wa-gray-400">{label}</p>
                    <p className="mt-0.5 text-body-sm font-medium text-wa-gray-900">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr]">
        <div className="space-y-4 sm:space-y-5">
          <AIToggle
            className="rounded-[22px] shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px] sm:p-6"
            enabled={autoReplyEnabled}
            onOptimisticChange={setAutoReplyEnabled}
          />

          <section className="rounded-[22px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px] sm:p-5">
            <p className="text-body-sm font-semibold text-wa-gray-900">Next actions</p>
            <div className="mt-4 grid gap-3">
              <button
                className="flex items-center justify-between rounded-2xl border border-wa-blue-100 bg-wa-blue-50 px-4 py-3 text-left text-body-sm font-medium text-wa-gray-800 transition hover:border-wa-blue-200 hover:bg-white"
                type="button"
                onClick={() => document.getElementById("live-whatsapp-check")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              >
                <span className="flex items-center gap-2">
                  <RadioTower className="size-4 text-wa-blue-600" aria-hidden="true" />
                  Run live check
                </span>
                <span className="text-wa-blue-600">Verify</span>
              </button>
              <Link
                className="flex items-center justify-between rounded-2xl border border-wa-gray-100 bg-wa-gray-50 px-4 py-3 text-body-sm font-medium text-wa-gray-800 transition hover:border-wa-blue-200 hover:bg-wa-blue-50"
                href="/messages"
              >
                <span className="flex items-center gap-2">
                  <MessageSquareText className="size-4 text-wa-blue-600" aria-hidden="true" />
                  Review inbox
                </span>
                <span className="text-wa-gray-400">Open</span>
              </Link>
              <Link
                className="flex items-center justify-between rounded-2xl border border-wa-gray-100 bg-wa-gray-50 px-4 py-3 text-body-sm font-medium text-wa-gray-800 transition hover:border-wa-blue-200 hover:bg-wa-blue-50"
                href="/dashboard"
              >
                <span className="flex items-center gap-2">
                  <Settings2 className="size-4 text-wa-blue-600" aria-hidden="true" />
                  Open dashboard
                </span>
                <span className="text-wa-gray-400">Manage</span>
              </Link>
            </div>
          </section>
        </div>

        <ConnectionStatus
          connection={connection}
          webhookUrl={`${appUrl.replace(/\/$/, "")}/api/webhooks/whatsapp`}
          autoReplyEnabled={autoReplyEnabled}
          isUpdating={false}
          onToggleAutoReply={() => undefined}
          onDisconnect={() => {
            if (window.confirm("Disconnect this WhatsApp number and delete associated messages?")) {
              disconnectMutation.mutate(connection.id);
            }
          }}
        />
      </div>

      <section id="live-whatsapp-check" className="scroll-mt-24">
        <LiveConnectionCheck connectionId={connection.id} />
      </section>

      {mockMode ? (
        <MockMessageSender
          phoneNumberId={connection.phoneNumberId}
          onSent={() => {
            void queryClient.invalidateQueries({ queryKey: ["messages"] });
          }}
        />
      ) : null}
    </div>
  );
}
