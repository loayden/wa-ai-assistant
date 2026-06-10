"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Broadcast creation stays a guided three-step surface so owners see
 * template approval, variables, and recipient count before sending anything.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Megaphone, RefreshCw, SendHorizonal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiData } from "@/lib/api/client";
import { parseRecipientLines } from "@/lib/broadcasts/utils";
import { extractTemplateVariables, maskTemplateVariables } from "@/lib/templates/meta";
import { cn } from "@/lib/utils";
import type {
  BroadcastMutationResponse,
  BroadcastProcessResponse,
  BroadcastResponse,
  BroadcastSendResponse,
  BroadcastStatusResponse,
  BroadcastsResponse,
  MessageTemplateResponse,
  MessageTemplatesResponse,
} from "@/types/api";

type CampaignForm = {
  name: string;
  templateId: string;
  parameters: string[];
  recipientsText: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(
    new Date(value),
  );
}

function statusLabel(status: BroadcastResponse["status"]) {
  if (status === "sending") return "جاري الإرسال";
  if (status === "completed") return "اكتملت";
  if (status === "failed") return "فشلت";
  return "مسودة";
}

function statusClasses(status: BroadcastResponse["status"]) {
  if (status === "completed") return "border-emerald-100 bg-emerald-50 text-emerald-700";
  if (status === "sending") return "border-wa-blue-100 bg-wa-blue-50 text-wa-blue-700";
  if (status === "failed") return "border-red-100 bg-red-50 text-red-700";
  return "border-wa-gray-100 bg-wa-gray-50 text-wa-gray-600";
}

function TemplateBubble({ parameters, template }: { parameters: string[]; template: MessageTemplateResponse | null }) {
  if (!template) {
    return (
      <div className="rounded-[24px] border border-wa-gray-100 bg-white p-4 text-body-sm leading-6 text-wa-gray-500">
        اختر قالباً معتمداً أولاً حتى ترى شكل الرسالة قبل الإرسال.
      </div>
    );
  }

  let preview = maskTemplateVariables(template.bodyText);
  parameters.forEach((value, index) => {
    const marker = `[متغير ${index + 1}]`;
    preview = preview.split(marker).join(value || marker);
  });

  return (
    <div className="rounded-[24px] bg-[#eef7f0] p-4">
      <div className="ml-auto max-w-[340px] rounded-[18px] bg-white px-4 py-3 text-right shadow-sm">
        {template.headerText ? <p className="text-body-sm font-semibold text-wa-gray-900">{template.headerText}</p> : null}
        <p className="mt-2 whitespace-pre-wrap text-body-sm leading-6 text-wa-gray-800">{preview}</p>
        {template.footerText ? <p className="mt-3 text-label text-wa-gray-400">{template.footerText}</p> : null}
        {template.buttonText ? (
          <p className="mt-3 rounded-xl bg-wa-blue-50 px-3 py-2 text-center text-body-sm font-semibold text-wa-blue-700">
            {template.buttonText}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function BroadcastRow({ broadcast }: { broadcast: BroadcastResponse }) {
  const completion =
    broadcast.recipientCount > 0 ? Math.round(((broadcast.sentCount + broadcast.failedCount) / broadcast.recipientCount) * 100) : 0;

  return (
    <article className="rounded-[22px] border border-wa-gray-100 bg-white p-4 shadow-[0_12px_34px_rgba(13,20,33,0.04)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-body-lg font-semibold text-wa-gray-900">{broadcast.name}</h3>
            <span className={cn("rounded-full border px-2.5 py-1 text-label font-semibold", statusClasses(broadcast.status))}>
              {statusLabel(broadcast.status)}
            </span>
          </div>
          <p className="mt-1 text-body-sm text-wa-gray-500">
            {broadcast.template?.displayName ?? "القالب محذوف"} · {formatDate(broadcast.createdAt)}
          </p>
        </div>
        <div className="text-left text-body-sm text-wa-gray-600 sm:text-right">
          <p>{broadcast.recipientCount.toLocaleString("ar-EG")} مستلم</p>
          <p>
            {broadcast.sentCount.toLocaleString("ar-EG")} تم · {broadcast.failedCount.toLocaleString("ar-EG")} فشل
          </p>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-wa-gray-100">
        <div className="h-full rounded-full bg-wa-blue-600 transition-all" style={{ width: `${completion}%` }} />
      </div>
    </article>
  );
}

export function BroadcastsPageClient() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CampaignForm>({
    name: "متابعة العملاء",
    templateId: "",
    parameters: [],
    recipientsText: "",
  });
  const [activeBroadcastId, setActiveBroadcastId] = useState<string | null>(null);
  const templatesQuery = useQuery({
    queryKey: ["templates"],
    queryFn: () => apiData<MessageTemplatesResponse>("/api/templates"),
  });
  const broadcastsQuery = useQuery({
    queryKey: ["broadcasts"],
    queryFn: () => apiData<BroadcastsResponse>("/api/broadcasts"),
  });
  const activeStatusQuery = useQuery({
    enabled: Boolean(activeBroadcastId),
    queryKey: ["broadcast-status", activeBroadcastId],
    queryFn: () => apiData<BroadcastStatusResponse>(`/api/broadcasts/${activeBroadcastId}/status`),
    refetchInterval: (query) => (query.state.data?.status === "sending" ? 2000 : false),
  });
  const approvedTemplates = useMemo(
    () => (templatesQuery.data?.templates ?? []).filter((template) => template.status === "approved"),
    [templatesQuery.data?.templates],
  );
  const selectedTemplate = approvedTemplates.find((template) => template.id === form.templateId) ?? null;
  const variables = selectedTemplate ? extractTemplateVariables(selectedTemplate.bodyText) : [];
  const recipients = useMemo(() => parseRecipientLines(form.recipientsText), [form.recipientsText]);
  const broadcasts = broadcastsQuery.data?.broadcasts ?? [];

  const sendMutation = useMutation({
    mutationFn: (broadcastId: string) =>
      apiData<BroadcastSendResponse>(`/api/broadcasts/${broadcastId}/send`, {
        method: "POST",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["broadcasts"] });
      if (activeBroadcastId) {
        void queryClient.invalidateQueries({ queryKey: ["broadcast-status", activeBroadcastId] });
      }
    },
  });
  const processMutation = useMutation({
    mutationFn: (broadcastId: string) =>
      apiData<BroadcastProcessResponse>(`/api/broadcasts/${broadcastId}/process`, {
        method: "POST",
      }),
    onSuccess: () => {
      if (activeBroadcastId) {
        void queryClient.invalidateQueries({ queryKey: ["broadcast-status", activeBroadcastId] });
      }
      void queryClient.invalidateQueries({ queryKey: ["broadcasts"] });
    },
  });
  const processBroadcastBatch = processMutation.mutate;
  const isProcessingBroadcastBatch = processMutation.isPending;
  const createMutation = useMutation({
    mutationFn: () =>
      apiData<BroadcastMutationResponse>("/api/broadcasts", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          templateId: form.templateId,
          parameters: form.parameters.slice(0, variables.length),
          recipients,
        }),
      }),
    onSuccess: (data) => {
      setActiveBroadcastId(data.broadcast.id);
      void queryClient.invalidateQueries({ queryKey: ["broadcasts"] });
      sendMutation.mutate(data.broadcast.id);
    },
  });

  function updateParameter(index: number, value: string) {
    setForm((current) => {
      const next = [...current.parameters];
      next[index] = value;
      return { ...current, parameters: next };
    });
  }

  const canSend = Boolean(form.name.trim() && form.templateId && recipients.length > 0 && !createMutation.isPending && !sendMutation.isPending);
  const latestProgress = activeStatusQuery.data;

  useEffect(() => {
    if (!activeBroadcastId || latestProgress?.status !== "sending" || isProcessingBroadcastBatch) return;

    const timer = window.setTimeout(() => {
      processBroadcastBatch(activeBroadcastId);
    }, 2_000);

    return () => window.clearTimeout(timer);
  }, [
    activeBroadcastId,
    latestProgress?.status,
    latestProgress?.sentCount,
    latestProgress?.failedCount,
    isProcessingBroadcastBatch,
    processBroadcastBatch,
  ]);

  return (
    <div className="kallem-workspace-page space-y-4">
      <section className="workspace-hero rounded-[28px] border border-wa-gray-100 bg-white p-5 shadow-[0_18px_56px_rgba(13,20,33,0.05)] sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">الحملات</p>
            <h1 className="mt-2 text-[32px] font-semibold leading-tight text-wa-gray-900 sm:text-[52px]">
              أرسل قوالب واتساب المعتمدة بأمان.
            </h1>
            <p className="mt-3 max-w-[760px] text-body-sm leading-6 text-wa-gray-600 sm:text-body-lg">
              استخدم الحملات للعروض، التذكير، والمتابعة بعد موافقة Meta على القالب. يرسل kallem الرسائل بهدوء لحماية رقمك من قيود الإرسال.
            </p>
          </div>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-wa-gray-200 px-4 text-body-sm font-semibold text-wa-gray-700 transition hover:bg-wa-gray-50"
            href="/templates"
          >
            إدارة القوالب
          </Link>
        </div>
        <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-body-sm leading-6 text-amber-800">
          <AlertTriangle className="mr-2 inline size-4" aria-hidden="true" />
          الحملات متاحة في خطة Pro وما بعدها. يمكن للحساب المجاني تجهيز الحملة، لكن الإرسال يتوقف من الخادم حتى الترقية.
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4 rounded-[28px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-wa-blue-50 text-wa-blue-600">
              <Megaphone className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-body-lg font-semibold text-wa-gray-900">إنشاء حملة</h2>
              <p className="text-body-sm text-wa-gray-500">ثلاث خطوات: القالب، المستلمون، ثم المراجعة.</p>
            </div>
          </div>

          <div className="rounded-[22px] border border-wa-gray-100 bg-wa-gray-50 p-4">
            <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">الخطوة ١</p>
            <label className="mt-3 block space-y-2">
              <span className="text-body-sm font-semibold text-wa-gray-800">اسم الحملة</span>
              <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label className="mt-3 block space-y-2">
              <span className="text-body-sm font-semibold text-wa-gray-800">القالب المعتمد</span>
              <select
                className="h-12 w-full rounded-lg border border-wa-gray-100 bg-white px-3 text-body-sm text-wa-gray-800 focus-visible:border-wa-blue-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-wa-blue-50 sm:h-14"
                value={form.templateId}
                onChange={(event) => setForm((current) => ({ ...current, templateId: event.target.value, parameters: [] }))}
              >
                <option value="">اختر قالباً معتمداً</option>
                {approvedTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.displayName}
                  </option>
                ))}
              </select>
            </label>
            {!templatesQuery.isLoading && approvedTemplates.length === 0 ? (
              <p className="mt-3 text-body-sm leading-6 text-wa-gray-600">
                لا توجد قوالب معتمدة بعد. أنشئ قالباً من صفحة <Link className="font-semibold text-wa-blue-700" href="/templates">القوالب</Link> ثم زامن الحالة بعد موافقة Meta.
              </p>
            ) : null}
          </div>

          <div className="rounded-[22px] border border-wa-gray-100 bg-wa-gray-50 p-4">
            <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">الخطوة ٢</p>
            <div className="mt-3 grid gap-3">
              {variables.length > 0 ? (
                variables.map((variable, index) => (
                  <label key={variable} className="space-y-2">
                    <span className="text-body-sm font-semibold text-wa-gray-800">المتغير {`{{${variable}}`}</span>
                    <Input
                      placeholder={`قيمة {{${variable}}}`}
                      value={form.parameters[index] ?? ""}
                      onChange={(event) => updateParameter(index, event.target.value)}
                    />
                  </label>
                ))
              ) : (
                <p className="rounded-2xl bg-white px-3 py-2 text-body-sm text-wa-gray-500">القالب المحدد لا يحتوي على متغيرات.</p>
              )}
            </div>
            <label className="mt-4 block space-y-2">
              <span className="text-body-sm font-semibold text-wa-gray-800">المستلمون</span>
              <Textarea
                className="min-h-[160px]"
                placeholder={"201144999221, لؤي\n201000000000, اسم العميل"}
                value={form.recipientsText}
                onChange={(event) => setForm((current) => ({ ...current, recipientsText: event.target.value }))}
              />
              <span className="text-label text-wa-gray-400">رقم واحد في كل سطر مع كود الدولة. يمكن إضافة الاسم بعد فاصلة.</span>
            </label>
          </div>

          <div className="rounded-[22px] border border-wa-gray-100 bg-white p-4">
            <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">الخطوة ٣</p>
            <div className="mt-3 grid gap-3 text-body-sm text-wa-gray-700 sm:grid-cols-3">
              <SummaryPill label="القالب" value={selectedTemplate?.displayName ?? "لم يتم الاختيار"} />
              <SummaryPill label="المستلمون" value={recipients.length.toLocaleString("ar-EG")} />
              <SummaryPill label="الفاصل" value="١٫٢ ثانية لكل رسالة" />
            </div>
            {createMutation.error || sendMutation.error ? (
              <p className="mt-4 rounded-2xl bg-red-50 px-3 py-2 text-body-sm text-red-700">
                {createMutation.error?.message ?? sendMutation.error?.message}
              </p>
            ) : null}
            {latestProgress ? (
              <div className="mt-4 rounded-2xl bg-wa-blue-50 px-4 py-3 text-body-sm text-wa-blue-800">
                <div className="flex items-center justify-between">
                  <span>{statusLabel(latestProgress.status)}</span>
                  <span>
                    {latestProgress.sentCount + latestProgress.failedCount}/{latestProgress.recipientCount}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-wa-blue-600"
                    style={{
                      width:
                        latestProgress.recipientCount > 0
                          ? `${((latestProgress.sentCount + latestProgress.failedCount) / latestProgress.recipientCount) * 100}%`
                          : "0%",
                    }}
                  />
                </div>
                {latestProgress.status === "sending" ? (
                  <p className="mt-2 text-label text-wa-blue-700">
                    اترك هذه الصفحة مفتوحة حتى يكتمل الإرسال. تتم معالجة دفعات صغيرة مناسبة لخطة Vercel المجانية.
                  </p>
                ) : null}
              </div>
            ) : null}
            <Button className="mt-4 w-full sm:w-auto" disabled={!canSend} isLoading={createMutation.isPending || sendMutation.isPending} onClick={() => createMutation.mutate()}>
              <SendHorizonal className="size-4" aria-hidden="true" />
              إرسال الحملة
            </Button>
          </div>
        </div>

        <aside className="space-y-4">
          <TemplateBubble parameters={form.parameters} template={selectedTemplate} />
          <section className="rounded-[24px] border border-wa-gray-100 bg-white p-4 shadow-[0_16px_48px_rgba(13,20,33,0.05)] sm:p-5">
            <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">أمان الإرسال</p>
            <div className="mt-4 space-y-3">
              <SafetyRow label="القالب معتمد" done={Boolean(selectedTemplate)} />
              <SafetyRow label="تم قراءة المستلمين" done={recipients.length > 0} />
              <SafetyRow label="الإرسال البطيء مفعّل" done />
            </div>
          </section>
        </aside>
      </section>

      <section className="grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-body-lg font-semibold text-wa-gray-900">الحملات السابقة</h2>
          <Button size="sm" variant="outline" onClick={() => void broadcastsQuery.refetch()}>
            <RefreshCw className={cn("size-4", broadcastsQuery.isFetching && "animate-spin")} aria-hidden="true" />
            تحديث
          </Button>
        </div>
        {broadcastsQuery.isLoading ? (
          <p className="rounded-2xl border border-wa-gray-100 bg-white p-4 text-body-sm text-wa-gray-500">جار تحميل الحملات...</p>
        ) : broadcasts.length === 0 ? (
          <p className="rounded-2xl border border-wa-gray-100 bg-white p-4 text-body-sm leading-6 text-wa-gray-600">
            لا توجد حملات بعد. أنشئ حملة بعد توفر قالب معتمد وقائمة أرقام واضحة.
          </p>
        ) : (
          broadcasts.map((broadcast) => <BroadcastRow key={broadcast.id} broadcast={broadcast} />)
        )}
      </section>
    </div>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-wa-gray-100 bg-wa-gray-50 px-3 py-2">
      <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">{label}</p>
      <p className="mt-1 truncate font-semibold text-wa-gray-900">{value}</p>
    </div>
  );
}

function SafetyRow({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-wa-gray-50 px-3 py-2 text-body-sm text-wa-gray-700">
      <CheckCircle2 className={cn("size-4", done ? "text-emerald-600" : "text-wa-gray-300")} aria-hidden="true" />
      {label}
    </div>
  );
}
