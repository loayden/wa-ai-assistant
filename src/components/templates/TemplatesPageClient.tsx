// FILE: src/components/templates/TemplatesPageClient.tsx
"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Template management stays inline and guided because templates are a
 * compliance-heavy WhatsApp feature that needs preview and status clarity.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, FileText, RefreshCw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiData } from "@/lib/api/client";
import { extractTemplateVariables, maskTemplateVariables, normalizeTemplateName } from "@/lib/templates/meta";
import { cn } from "@/lib/utils";
import type { MessageTemplateResponse, MessageTemplatesResponse } from "@/types/api";

type FormState = {
  name: string;
  displayName: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  language: "ar" | "en";
  headerText: string;
  bodyText: string;
  footerText: string;
  buttonText: string;
  buttonUrl: string;
};

const defaultForm: FormState = {
  name: "follow_up_offer",
  displayName: "عرض متابعة",
  category: "MARKETING",
  language: "ar",
  headerText: "عرض من kallem",
  bodyText: "مرحباً {{1}}، عندنا عرض مناسب لك. هل تحب نرسل لك التفاصيل؟",
  footerText: "يمكنك الرد في أي وقت",
  buttonText: "",
  buttonUrl: "",
};

const statusLabels: Record<MessageTemplateResponse["status"], string> = {
  draft: "مسودة",
  pending: "قيد المراجعة",
  approved: "معتمد",
  rejected: "مرفوض",
};

const categoryLabels: Record<MessageTemplateResponse["category"], string> = {
  MARKETING: "تسويق",
  UTILITY: "خدمة",
  AUTHENTICATION: "مصادقة",
};

function statusClassName(status: MessageTemplateResponse["status"]) {
  if (status === "approved") return "border-emerald-100 bg-emerald-50 text-emerald-700";
  if (status === "pending") return "border-amber-100 bg-amber-50 text-amber-700";
  if (status === "rejected") return "border-red-100 bg-red-50 text-red-700";
  return "border-wa-gray-100 bg-wa-gray-50 text-wa-gray-600";
}

function TemplatePreview({ form }: { form: FormState }) {
  const variables = extractTemplateVariables(form.bodyText);

  return (
    <aside className="rounded-[24px] border border-wa-gray-100 bg-white p-4 shadow-[0_16px_48px_rgba(13,20,33,0.05)] sm:p-5">
      <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">معاينة مباشرة</p>
      <div className="mt-4 rounded-[24px] bg-[#eef7f0] p-4">
        <div className="ml-auto max-w-[320px] rounded-[18px] bg-white px-4 py-3 text-right shadow-sm">
          {form.headerText ? <p className="text-body-sm font-semibold text-wa-gray-900">{form.headerText}</p> : null}
          <p className="mt-2 whitespace-pre-wrap text-body-sm leading-6 text-wa-gray-800">
            {maskTemplateVariables(form.bodyText)}
          </p>
          {form.footerText ? <p className="mt-3 text-label text-wa-gray-400">{form.footerText}</p> : null}
          {form.buttonText && form.buttonUrl ? (
            <p className="mt-3 rounded-xl bg-wa-blue-50 px-3 py-2 text-center text-body-sm font-semibold text-wa-blue-700">
              {form.buttonText}
            </p>
          ) : null}
        </div>
      </div>
      <p className="mt-4 text-body-sm leading-6 text-wa-gray-600">
        {variables.length > 0
          ? `المتغيرات المطلوبة: ${variables.map((value) => `{{${value}}}`).join(", ")}`
          : "لا توجد متغيرات في هذا القالب."}
      </p>
    </aside>
  );
}

function TemplateCard({ template }: { template: MessageTemplateResponse }) {
  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: () => apiData(`/api/templates/${template.id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });

  return (
    <article className="rounded-[22px] border border-wa-gray-100 bg-white p-4 shadow-[0_12px_34px_rgba(13,20,33,0.04)] sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-body-lg font-semibold text-wa-gray-900">{template.displayName}</h3>
            <span className="rounded-full border border-wa-blue-100 bg-wa-blue-50 px-2.5 py-1 text-label font-semibold text-wa-blue-700">
              {categoryLabels[template.category]}
            </span>
            <span className={cn("rounded-full border px-2.5 py-1 text-label font-semibold", statusClassName(template.status))}>
              {statusLabels[template.status]}
            </span>
          </div>
          <p className="mt-1 text-label text-wa-gray-400">{template.name}</p>
        </div>
        <Button
          aria-label="حذف القالب"
          disabled={deleteMutation.isPending}
          size="sm"
          variant="outline"
          onClick={() => deleteMutation.mutate()}
        >
          <Trash2 className="size-4" aria-hidden="true" />
          حذف
        </Button>
      </div>
      <p className="mt-4 line-clamp-2 text-body-sm leading-6 text-wa-gray-600">{maskTemplateVariables(template.bodyText)}</p>
      {template.rejectionReason ? (
        <p className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-body-sm text-red-700">{template.rejectionReason}</p>
      ) : null}
    </article>
  );
}

export function TemplatesPageClient() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(defaultForm);
  const templatesQuery = useQuery({
    queryKey: ["templates"],
    queryFn: () => apiData<MessageTemplatesResponse>("/api/templates"),
  });
  const templates = templatesQuery.data?.templates ?? [];
  const approvedCount = templates.filter((template) => template.status === "approved").length;
  const createMutation = useMutation({
    mutationFn: (payload: FormState) =>
      apiData("/api/templates", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setForm(defaultForm);
      void queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
  const syncMutation = useMutation({
    mutationFn: () => apiData<MessageTemplatesResponse>("/api/templates/sync", { method: "POST" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });

  const variables = useMemo(() => extractTemplateVariables(form.bodyText), [form.bodyText]);

  function updateForm<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="mx-auto max-w-[1120px] space-y-5 px-3 pb-8 pt-4 sm:px-6 sm:pt-8">
      <section className="rounded-[28px] border border-wa-gray-100 bg-white p-5 shadow-[0_18px_56px_rgba(13,20,33,0.05)] sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">قوالب الرسائل</p>
            <h1 className="mt-2 text-[32px] font-semibold leading-tight text-wa-gray-900 sm:text-[52px]">
              أعد فتح المحادثات بقوالب واتساب المعتمدة.
            </h1>
            <p className="mt-3 max-w-[760px] text-body-sm leading-6 text-wa-gray-600 sm:text-body-lg">
              أنشئ رسائل معتمدة من Meta للعروض، التحديثات، التذكير، والمتابعة. القوالب مطلوبة عندما تنتهي نافذة الرد الحر بعد ٢٤ ساعة.
            </p>
          </div>
          <Button disabled={syncMutation.isPending} variant="outline" onClick={() => syncMutation.mutate()}>
            <RefreshCw className={cn("size-4", syncMutation.isPending && "animate-spin")} aria-hidden="true" />
            مزامنة الحالة
          </Button>
        </div>
        <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-body-sm leading-6 text-amber-800">
          <AlertTriangle className="mr-2 inline size-4" aria-hidden="true" />
          القوالب تحتاج موافقة Meta قبل الاستخدام. المراجعة قد تستغرق من عدة ساعات إلى يوم واحد.
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <form
          className="rounded-[28px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:p-5"
          onSubmit={(event) => {
            event.preventDefault();
            createMutation.mutate({ ...form, name: normalizeTemplateName(form.name) });
          }}
        >
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-wa-blue-50 text-wa-blue-600">
              <FileText className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-body-lg font-semibold text-wa-gray-900">إنشاء قالب</h2>
              <p className="text-body-sm text-wa-gray-500">استخدم لغة واضحة ومناسبة للنشاط، وتجنب الوعود المبالغ فيها.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-body-sm font-semibold text-wa-gray-800">الاسم الداخلي</span>
              <Input
                value={form.name}
                onChange={(event) => updateForm("name", normalizeTemplateName(event.target.value))}
              />
            </label>
            <label className="space-y-2">
              <span className="text-body-sm font-semibold text-wa-gray-800">الاسم الظاهر</span>
              <Input value={form.displayName} onChange={(event) => updateForm("displayName", event.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="text-body-sm font-semibold text-wa-gray-800">الفئة</span>
              <select
                className="h-12 w-full rounded-lg border border-wa-gray-100 bg-wa-gray-50 px-3 text-body-sm text-wa-gray-800 focus-visible:border-wa-blue-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-wa-blue-50 sm:h-14"
                value={form.category}
                onChange={(event) => updateForm("category", event.target.value as FormState["category"])}
              >
                <option value="MARKETING">تسويق</option>
                <option value="UTILITY">خدمة</option>
                <option value="AUTHENTICATION">مصادقة</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-body-sm font-semibold text-wa-gray-800">اللغة</span>
              <select
                className="h-12 w-full rounded-lg border border-wa-gray-100 bg-wa-gray-50 px-3 text-body-sm text-wa-gray-800 focus-visible:border-wa-blue-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-wa-blue-50 sm:h-14"
                value={form.language}
                onChange={(event) => updateForm("language", event.target.value as FormState["language"])}
              >
                <option value="ar">العربية</option>
                <option value="en">الإنجليزية</option>
              </select>
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-body-sm font-semibold text-wa-gray-800">العنوان اختياري</span>
              <Input maxLength={60} value={form.headerText} onChange={(event) => updateForm("headerText", event.target.value)} />
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-body-sm font-semibold text-wa-gray-800">نص الرسالة</span>
              <Textarea
                value={form.bodyText}
                onChange={(event) => updateForm("bodyText", event.target.value)}
                placeholder="استخدم {{1}} و {{2}} للمتغيرات"
              />
              <span className="text-label text-wa-gray-400">
                {variables.length > 0 ? `تم اكتشاف ${variables.length.toLocaleString("ar-EG")} متغير.` : "لا توجد متغيرات."}
              </span>
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-body-sm font-semibold text-wa-gray-800">التذييل اختياري</span>
              <Input maxLength={60} value={form.footerText} onChange={(event) => updateForm("footerText", event.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="text-body-sm font-semibold text-wa-gray-800">نص الزر اختياري</span>
              <Input value={form.buttonText} onChange={(event) => updateForm("buttonText", event.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="text-body-sm font-semibold text-wa-gray-800">رابط الزر اختياري</span>
              <Input value={form.buttonUrl} onChange={(event) => updateForm("buttonUrl", event.target.value)} />
            </label>
          </div>
          {createMutation.error ? <p className="mt-4 text-body-sm text-wa-error">{createMutation.error.message}</p> : null}
          <Button className="mt-5 w-full sm:w-auto" isLoading={createMutation.isPending} type="submit">
            إرسال إلى Meta
          </Button>
        </form>

        <TemplatePreview form={form} />
      </section>

      <section className="grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-body-lg font-semibold text-wa-gray-900">القوالب المحفوظة</h2>
          <span className="rounded-full bg-wa-blue-50 px-3 py-1 text-label font-semibold text-wa-blue-700">
            {approvedCount.toLocaleString("ar-EG")} معتمد
          </span>
        </div>
        {templatesQuery.isLoading ? (
          <p className="rounded-2xl border border-wa-gray-100 bg-white p-4 text-body-sm text-wa-gray-500">جارٍ تحميل القوالب...</p>
        ) : templates.length === 0 ? (
          <p className="rounded-2xl border border-wa-gray-100 bg-white p-4 text-body-sm leading-6 text-wa-gray-600">
            لا توجد قوالب بعد. أنشئ أول قالب، انتظر موافقة Meta، ثم استخدمه للمتابعة والحملات.
          </p>
        ) : (
          templates.map((template) => <TemplateCard key={template.id} template={template} />)
        )}
      </section>
    </div>
  );
}
