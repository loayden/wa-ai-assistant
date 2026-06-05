// FILE: src/components/whatsapp/LiveConnectionCheck.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Connected WhatsApp users need a plain live-readiness check because
 * the manual Meta setup path is the production path until Embedded Signup is
 * available for the business.
 */
"use client";

import { useMutation } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, ClipboardCheck, RadioTower, RefreshCw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { apiData } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type DiagnosticStatus = "passed" | "warning" | "failed";

type DiagnosticCheck = {
  id: string;
  label: string;
  status: DiagnosticStatus;
  detail: string;
};

type DiagnosticsResponse = {
  connected: boolean;
  mode?: "mock" | "live";
  checks: DiagnosticCheck[];
};

type LiveConnectionCheckProps = {
  connectionId: string;
};

const statusTone: Record<DiagnosticStatus, string> = {
  passed: "border-wa-success-bg bg-wa-success-bg text-wa-success",
  warning: "border-wa-warning-bg bg-wa-warning-bg text-wa-warning",
  failed: "border-wa-error-bg bg-wa-error-bg text-wa-error",
};

function getOverallStatus(checks?: DiagnosticCheck[]): DiagnosticStatus | "idle" {
  if (!checks?.length) {
    return "idle";
  }

  if (checks.some((check) => check.status === "failed")) {
    return "failed";
  }

  if (checks.some((check) => check.status === "warning")) {
    return "warning";
  }

  return "passed";
}

export function LiveConnectionCheck({ connectionId }: LiveConnectionCheckProps) {
  const diagnosticsMutation = useMutation({
    mutationFn: () => apiData<DiagnosticsResponse>(`/api/whatsapp/diagnostics?connectionId=${connectionId}`),
  });
  const checks = diagnosticsMutation.data?.checks;
  const overallStatus = getOverallStatus(checks);
  const isMetaTestNumber = checks?.some(
    (check) => check.id === "phone-profile" && /test number|\+1 555-142-1769|15551421769/i.test(check.detail),
  );

  return (
    <Card className="overflow-hidden rounded-[22px] border-wa-gray-100 bg-white shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px]">
      <CardHeader className="border-b border-wa-gray-100 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-wa-blue-50 text-wa-blue-600">
              <ClipboardCheck className="size-5" aria-hidden="true" />
            </span>
            <div>
              <CardTitle className="text-body font-semibold">فحص جاهزية الاتصال</CardTitle>
              <p className="mt-2 text-body-sm leading-6 text-wa-gray-600">
                تأكدي من صلاحية بيانات Meta وملكية الرقم واشتراك Webhook قبل دعوة العملاء الحقيقيين.
              </p>
            </div>
          </div>
          {overallStatus !== "idle" ? (
            <StatusBadge
              className="self-start px-3 py-1"
              label={overallStatus === "passed" ? "جاهز للعملاء" : overallStatus === "warning" ? "تجربة / مراجعة" : "يحتاج إصلاح"}
              variant={overallStatus === "passed" ? "active" : overallStatus === "warning" ? "paused" : "error"}
            />
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-4">
          <p className="text-body-sm font-semibold text-wa-gray-900">كيف تعمل الردود؟</p>
          <ol className="mt-3 list-decimal space-y-2 pr-4 text-body-sm leading-6 text-wa-gray-600">
            <li>العميل يرسل رسالة إلى رقم واتساب المتصل.</li>
            <li>kallem يستقبل الرسالة من خلال Webhook.</li>
            <li>المساعد يكتب ويرسل الرد تلقائيًا عندما يكون رصيد الردود وإرسال واتساب متاحين.</li>
          </ol>
          <p className="mt-3 rounded-xl bg-white px-3 py-2 text-body-sm leading-6 text-wa-gray-700">
            العملاء الحقيقيون يحتاجون رقم WhatsApp Business إنتاجي. أرقام Meta التجريبية للعرض فقط وتحتاج أرقام اختبار معتمدة.
          </p>
        </div>

        <Button
          className="w-full rounded-full"
          isLoading={diagnosticsMutation.isPending}
          onClick={() => diagnosticsMutation.mutate()}
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          {diagnosticsMutation.isPending ? "جارٍ فحص الاتصال..." : "تشغيل الفحص"}
        </Button>

        {diagnosticsMutation.error ? (
          <Alert className="border-wa-error bg-wa-error-bg">
            <AlertTitle>فشل فحص الجاهزية</AlertTitle>
            <AlertDescription>
              {diagnosticsMutation.error instanceof Error ? diagnosticsMutation.error.message : "تعذر تشغيل فحص واتساب."}
            </AlertDescription>
          </Alert>
        ) : null}

        {checks?.length ? (
          <div className="space-y-2">
            {checks.map((check) => (
              <div key={check.id} className={cn("rounded-2xl border p-3 sm:p-4", statusTone[check.status])}>
                <div className="flex items-start gap-3">
                  {check.status === "failed" ? (
                    <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                  )}
                  <div>
                    <p className="text-body-sm font-semibold">{check.label}</p>
                    <p className="mt-1 break-words text-body-sm leading-6 opacity-90">{check.detail}</p>
                  </div>
                </div>
              </div>
            ))}
            {isMetaTestNumber ? (
              <div className="rounded-2xl border border-wa-warning-bg bg-wa-warning-bg p-4 text-wa-warning">
                <p className="text-body-sm font-semibold">تم اكتشاف رقم تجريبي فقط</p>
                <p className="mt-2 text-body-sm leading-6">
                  لذلك تطلب Meta خطوة “Add recipient phone number”. هذه قاعدة اختبار من Meta وليست من kallem.
                  العملاء الحقيقيون يمكنهم المراسلة واستلام الردود بعد ربط رقم WhatsApp Business إنتاجي.
                </p>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-2xl border border-wa-blue-100 bg-wa-blue-50 p-4 text-wa-gray-700">
            <RadioTower className="mt-0.5 size-5 shrink-0 text-wa-blue-600" aria-hidden="true" />
            <p className="text-body-sm leading-6">
              هذا الفحص لا يرسل رسالة للعميل. هو يتأكد فقط أن kallem يستطيع الوصول إلى Meta باستخدام الاتصال المحفوظ.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
