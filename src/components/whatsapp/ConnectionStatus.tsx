// FILE: src/components/whatsapp/ConnectionStatus.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Connected state exposes only masked credentials while keeping
 * operational controls for auto-reply, webhook setup, and disconnect.
 */
"use client";

import type { ReactNode } from "react";
import { Building2, Copy, KeyRound, Radio, ShieldCheck, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/StatusBadge";

export type WhatsAppConnectionSummary = {
  id: string;
  phoneNumberId: string;
  businessAccountId: string;
  accessTokenMasked: string;
  ownerPhoneNumberMasked: string | null;
  displayName: string | null;
  isActive: boolean;
  isVerified: boolean;
};

type ConnectionStatusProps = {
  connection: WhatsAppConnectionSummary;
  webhookUrl: string;
  autoReplyEnabled: boolean;
  isUpdating: boolean;
  onToggleAutoReply: (enabled: boolean) => void;
  onDisconnect: () => void;
};

export function ConnectionStatus({
  autoReplyEnabled,
  connection,
  isUpdating,
  webhookUrl,
  onDisconnect,
}: ConnectionStatusProps) {
  const statusLabel = connection.isActive ? "متصل" : "متوقف";
  const statusVariant = connection.isActive ? "active" : "paused";
  const replyLabel = autoReplyEnabled ? "يرد الآن" : "متوقف";

  return (
    <Card className="overflow-hidden rounded-[22px] border-wa-gray-100 bg-white shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px]">
      <CardContent className="p-0">
        <div className="flex items-start justify-between gap-3 border-b border-wa-gray-100 p-4 sm:gap-4 sm:p-6">
          <div>
            <p className="text-body font-semibold text-wa-gray-900">{connection.displayName ?? "رقم واتساب متصل"}</p>
            <p className="mt-2 max-w-[640px] text-body-sm leading-6 text-wa-gray-600">
              هذا الرقم جاهز للمساعد. الرسائل تدخل صندوق الوارد وتخرج الردود من حساب واتساب المتصل.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge className="px-3 py-1" label={statusLabel} variant={statusVariant} />
              <StatusBadge className="px-3 py-1" label={replyLabel} variant={autoReplyEnabled ? "active" : "paused"} />
            </div>
          </div>
          {isUpdating ? <StatusBadge label="جارٍ التحديث" variant="paused" /> : null}
        </div>

        <div className="space-y-4 p-4 sm:space-y-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryCard
              label="حالة المساعد"
              value={autoReplyEnabled ? "يرد على العملاء" : "متوقف الآن"}
              icon={<Radio className="size-4 text-wa-blue-600" aria-hidden="true" />}
            />
            <SummaryCard
              label="Webhook"
              value="متصل ومشترك"
              icon={<ShieldCheck className="size-4 text-wa-success" aria-hidden="true" />}
            />
            <SummaryCard
              label="رقم المالك"
              value={connection.ownerPhoneNumberMasked ?? "غير محفوظ"}
              icon={<KeyRound className="size-4 text-wa-gray-500" aria-hidden="true" />}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <CredentialBlock
              icon={<Radio className="size-4" aria-hidden="true" />}
              label="معرّف رقم واتساب"
              value={connection.phoneNumberId}
            />
            <CredentialBlock
              icon={<Building2 className="size-4" aria-hidden="true" />}
              label="حساب واتساب التجاري"
              value={connection.businessAccountId}
            />
          </div>

          <details className="rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-4 sm:rounded-[22px] sm:p-5">
            <summary className="cursor-pointer text-body-sm font-semibold text-wa-blue-600">إعدادات متقدمة</summary>
            <div className="mt-4 space-y-4">
              <CredentialBlock
                icon={<KeyRound className="size-4" aria-hidden="true" />}
                label="رمز الوصول"
                value={connection.accessTokenMasked}
              />
              <div className="space-y-2">
                <p className="text-label font-medium uppercase tracking-widest text-wa-gray-400">رابط Webhook</p>
                <div className="flex gap-2">
                  <code className="min-w-0 flex-1 overflow-x-auto rounded-xl border border-wa-gray-100 bg-white px-3 py-3 font-mono text-mono text-wa-gray-600">
                    {webhookUrl}
                  </code>
                  <Button
                    aria-label="نسخ رابط Webhook"
                    className="shrink-0"
                    size="icon"
                    variant="outline"
                    onClick={() => void navigator.clipboard.writeText(webhookUrl)}
                  >
                    <Copy className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
              <Button className="w-full rounded-full" variant="destructive" onClick={onDisconnect}>
                <Trash2 className="size-4" aria-hidden="true" />
                فصل الرقم
              </Button>
            </div>
          </details>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-3 sm:p-4">
      <div className="mb-2.5 flex size-9 items-center justify-center rounded-xl bg-white shadow-[0_10px_28px_rgba(13,20,33,0.05)] sm:mb-3 sm:size-10 sm:rounded-2xl">
        {icon}
      </div>
      <p className="text-label font-medium uppercase tracking-widest text-wa-gray-400">{label}</p>
      <p className="mt-1 text-body-sm font-medium text-wa-gray-900">{value}</p>
    </div>
  );
}

function CredentialBlock({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-wa-gray-100 bg-white p-3 sm:p-4">
      <div className="mb-3 flex items-center gap-2 text-wa-blue-600">
        <span className="flex size-8 items-center justify-center rounded-xl bg-wa-blue-50">{icon}</span>
        <p className="text-label font-medium uppercase tracking-widest text-wa-gray-400">{label}</p>
      </div>
      <p className="break-all font-mono text-mono text-wa-gray-800">{value}</p>
    </div>
  );
}
