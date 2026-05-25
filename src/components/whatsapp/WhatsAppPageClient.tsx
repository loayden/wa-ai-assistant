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
import { Bot, CheckCircle2, Info, MessageSquareText, Plus, RadioTower, Settings2, Smartphone } from "lucide-react";

import { AIToggle } from "@/components/ai/AIToggle";
import { MockMessageSender } from "@/components/messages/MockMessageSender";
import { SocialChannelCards } from "@/components/social/SocialChannelCards";
import { SetupFlow } from "@/components/whatsapp/SetupFlow";
import { ConnectionStatus, type WhatsAppConnectionSummary } from "@/components/whatsapp/ConnectionStatus";
import { LiveConnectionCheck } from "@/components/whatsapp/LiveConnectionCheck";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { apiData } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { SettingsResponse } from "@/types/api";
import { PLAN_LIMITS, type PlanTier } from "@/types/subscription";

type WhatsAppPageClientProps = {
  appUrl: string;
  embeddedSignupAppId: string | null;
  embeddedSignupConfigId: string | null;
  embeddedSignupEnabled: boolean;
  apiVersion: string;
  initialConnections: WhatsAppConnectionSummary[];
  initialSettings: SettingsResponse["settings"];
  mockMode: boolean;
  planTier: PlanTier;
};

export function WhatsAppPageClient({
  apiVersion,
  appUrl,
  embeddedSignupAppId,
  embeddedSignupConfigId,
  embeddedSignupEnabled,
  initialConnections,
  initialSettings,
  mockMode,
  planTier,
}: WhatsAppPageClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [connections, setConnections] = useState<WhatsAppConnectionSummary[]>(initialConnections);
  const [selectedConnectionId, setSelectedConnectionId] = useState(initialConnections[0]?.id ?? "");
  const [showSetup, setShowSetup] = useState(initialConnections.length === 0);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(initialSettings.autoReplyEnabled);
  const connection = connections.find((item) => item.id === selectedConnectionId) ?? connections[0] ?? null;
  const planLimit = PLAN_LIMITS[planTier].maxConnections;
  const atConnectionLimit = connections.filter((item) => item.isActive).length >= planLimit;
  const disconnectMutation = useMutation({
    mutationFn: (connectionId: string) => apiData(`/api/whatsapp/connect?id=${connectionId}`, { method: "DELETE" }),
    onSuccess: (_data, connectionId) => {
      setConnections((current) => {
        const next = current.filter((item) => item.id !== connectionId);
        setSelectedConnectionId(next[0]?.id ?? "");
        setShowSetup(next.length === 0);
        return next;
      });
      void queryClient.invalidateQueries({ queryKey: ["whatsapp-connections"] });
      router.refresh();
    },
  });

  if (showSetup || !connection) {
    return (
      <div className="mx-auto max-w-[1120px] space-y-4 px-3 pb-8 pt-4 sm:px-6 sm:pt-8">
        {connections.length > 0 ? (
          <button
            className="inline-flex min-h-10 items-center rounded-full border border-wa-gray-100 bg-white px-4 text-body-sm font-semibold text-wa-gray-700 transition hover:bg-wa-gray-50"
            type="button"
            onClick={() => setShowSetup(false)}
          >
            الرجوع للقنوات المتصلة
          </button>
        ) : null}
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
        <SocialChannelCards
          apiVersion={apiVersion}
          appId={embeddedSignupAppId}
          whatsappConnected={connections.some((item) => item.isActive && item.isVerified)}
        />
      </div>
    );
  }

  const connectedFacts = [
    {
      icon: CheckCircle2,
      label: "واتساب موثق",
      value: connection.displayName ?? "واتساب متصل",
    },
    {
      icon: RadioTower,
      label: "Webhook جاهز",
      value: "الرسائل تصل إلى الصندوق",
    },
    {
      icon: Bot,
      label: "ردود AI",
      value: autoReplyEnabled ? "يرد على العملاء" : "متوقف من المالك",
    },
  ];
  const isMetaTestConnection = /test number/i.test(connection.displayName ?? "");

  return (
    <div className="mx-auto max-w-[1120px] space-y-4 px-3 pb-8 pt-4 sm:space-y-6 sm:px-6 sm:pt-8">
      {mockMode ? (
        <Alert className="border-wa-warning bg-wa-warning-bg text-wa-warning">
          <AlertTitle>وضع التجربة مفعّل</AlertTitle>
          <AlertDescription>لن يتم إرسال رسائل واتساب حقيقية من هذه البيئة.</AlertDescription>
        </Alert>
      ) : null}

      {isMetaTestConnection ? (
        <Alert className="border-wa-blue-100 bg-wa-blue-50 text-wa-gray-800">
          <Info className="size-4 text-wa-blue-600" aria-hidden="true" />
          <AlertTitle>رقم اختبار من Meta</AlertTitle>
          <AlertDescription>
            هذا الرقم للاختبار فقط. يمكنه استقبال الرسائل، لكن Meta تسمح بالرد فقط على أرقام اختبار معتمدة.
            العملاء الحقيقيون لا يحتاجون هذه الخطوة بعد ربط رقم واتساب Business إنتاجي.
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="overflow-hidden rounded-[22px] border border-wa-gray-100 bg-white shadow-[0_18px_56px_rgba(13,20,33,0.05)] sm:rounded-[32px]">
        <div className="grid gap-4 p-4 sm:gap-6 sm:p-8 lg:grid-cols-[1fr_0.78fr] lg:items-center">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <StatusBadge className="px-3 py-1" label="متصل" variant="active" />
              <StatusBadge
                className="px-3 py-1"
                label={autoReplyEnabled ? "يرد الآن" : "متوقف"}
                variant={autoReplyEnabled ? "active" : "paused"}
              />
            </div>
            <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">مركز القنوات</p>
            <h1 className="mt-2 max-w-[640px] text-[28px] font-semibold leading-tight text-wa-gray-900 sm:mt-3 sm:text-[54px] sm:leading-[1.06]">
              المساعد جاهز للقنوات المتصلة.
            </h1>
            <p className="mt-3 max-w-[680px] text-body-sm leading-6 text-wa-gray-600 sm:mt-5 sm:text-body-lg">
              شغّلي أو أوقفي ردود AI، راجعي تفاصيل واتساب، وأضيفي إنستجرام وماسنجر من نفس شاشة القنوات.
            </p>
          </div>
          <div className="rounded-[20px] border border-wa-blue-100 bg-wa-blue-50 p-4 sm:rounded-[26px] sm:p-5">
            <p className="text-body-sm font-semibold text-wa-blue-600">الحالة اليومية</p>
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

      <section className="rounded-[22px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px] sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-body-sm font-semibold text-wa-gray-900">اتصالات واتساب</p>
            <p className="mt-1 text-body-sm text-wa-gray-500">
              مستخدم {connections.length} من {planLimit} اتصال واتساب في خطة {planTier.toLowerCase()}.
            </p>
          </div>
          <button
            className={cn(
              "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-body-sm font-semibold transition",
              atConnectionLimit
                ? "cursor-not-allowed border border-wa-gray-100 bg-wa-gray-50 text-wa-gray-400"
                : "bg-wa-blue-600 text-white hover:bg-wa-blue-700",
            )}
            disabled={atConnectionLimit}
            type="button"
            onClick={() => setShowSetup(true)}
          >
            <Plus className="size-4" aria-hidden="true" />
            إضافة واتساب
          </button>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-wa-gray-100">
          <div className="h-full rounded-full bg-wa-blue-600" style={{ width: `${Math.min(100, (connections.length / planLimit) * 100)}%` }} />
        </div>
        {atConnectionLimit ? (
          <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-body-sm text-amber-800">
            خطتك تسمح بعدد {planLimit} من اتصالات واتساب النشطة. يمكنك الترقية من الفوترة لإضافة المزيد.
          </p>
        ) : null}
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {connections.map((item) => {
            const active = item.id === connection.id;

            return (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "rounded-2xl border p-4 text-right transition",
                  active ? "border-wa-blue-200 bg-wa-blue-50" : "border-wa-gray-100 bg-wa-gray-50 hover:bg-white",
                )}
                onClick={() => setSelectedConnectionId(item.id)}
              >
                <span className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-2xl bg-white text-wa-blue-600">
                    <Smartphone className="size-5" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-body-sm font-semibold text-wa-gray-900">{item.displayName ?? "اتصال واتساب"}</span>
                    <span className="block text-label text-wa-gray-500">{item.ownerPhoneNumberMasked ?? item.phoneNumberId}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <SocialChannelCards
        apiVersion={apiVersion}
        appId={embeddedSignupAppId}
        whatsappConnected={connections.some((item) => item.isActive && item.isVerified)}
      />

      <div className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr]">
        <div className="space-y-4 sm:space-y-5">
          <AIToggle
            className="rounded-[22px] shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px] sm:p-6"
            enabled={autoReplyEnabled}
            onOptimisticChange={setAutoReplyEnabled}
          />

          <section className="rounded-[22px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px] sm:p-5">
            <p className="text-body-sm font-semibold text-wa-gray-900">الخطوات التالية</p>
            <div className="mt-4 grid gap-3">
              <button
                className="flex items-center justify-between rounded-2xl border border-wa-blue-100 bg-wa-blue-50 px-4 py-3 text-right text-body-sm font-medium text-wa-gray-800 transition hover:border-wa-blue-200 hover:bg-white"
                type="button"
                onClick={() => document.getElementById("live-whatsapp-check")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              >
                <span className="flex items-center gap-2">
                  <RadioTower className="size-4 text-wa-blue-600" aria-hidden="true" />
                  فحص الاتصال الحي
                </span>
                <span className="text-wa-blue-600">تحقق</span>
              </button>
              <Link
                className="flex items-center justify-between rounded-2xl border border-wa-gray-100 bg-wa-gray-50 px-4 py-3 text-body-sm font-medium text-wa-gray-800 transition hover:border-wa-blue-200 hover:bg-wa-blue-50"
                href="/messages"
              >
                <span className="flex items-center gap-2">
                  <MessageSquareText className="size-4 text-wa-blue-600" aria-hidden="true" />
                  مراجعة الرسائل
                </span>
                <span className="text-wa-gray-400">فتح</span>
              </Link>
              <Link
                className="flex items-center justify-between rounded-2xl border border-wa-gray-100 bg-wa-gray-50 px-4 py-3 text-body-sm font-medium text-wa-gray-800 transition hover:border-wa-blue-200 hover:bg-wa-blue-50"
                href="/dashboard"
              >
                <span className="flex items-center gap-2">
                  <Settings2 className="size-4 text-wa-blue-600" aria-hidden="true" />
                  فتح الرئيسية
                </span>
                <span className="text-wa-gray-400">إدارة</span>
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
            if (window.confirm("هل تريدين فصل رقم واتساب وحذف الرسائل المرتبطة به؟")) {
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
