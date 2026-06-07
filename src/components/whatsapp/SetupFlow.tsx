"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: The setup surface leads with the working manual Meta flow while
 * keeping embedded signup optional and secondary when it is actually enabled.
 */
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  Bot,
  Building2,
  CheckCircle2,
  KeyRound,
  LockKeyhole,
  MessageSquareText,
  RadioTower,
  ShieldCheck,
} from "lucide-react";

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
            <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">مركز القنوات</p>
            <h1 className="mt-2 max-w-[640px] text-[28px] font-semibold leading-tight text-wa-gray-900 sm:mt-3 sm:text-[54px] sm:leading-[1.06]">
              ابدئي بواتساب، ثم أضيفي إنستجرام وماسنجر من نفس المركز.
            </h1>
            <p className="mt-3 max-w-[680px] text-body-sm leading-6 text-wa-gray-600 sm:mt-5 sm:text-body-lg">
              يتحقق {BRAND_NAME} من بيانات كل قناة قبل تشغيل الردود عليها. هذه الخطوة تربط رقم واتساب التجاري، وبعدها تظهر بطاقات إنستجرام وماسنجر في نفس الصفحة.
            </p>
          </div>
          <div className="rounded-[20px] border border-wa-blue-100 bg-wa-blue-50 p-4 sm:rounded-[26px] sm:p-5">
            <p className="text-body-sm font-semibold text-wa-blue-600">القنوات التي يديرها kallem</p>
            <p className="mt-2 text-body-sm leading-6 text-wa-gray-700">
              الهدف ليس واتساب فقط. الهدف أن تصل رسائل العملاء من واتساب وإنستجرام وماسنجر إلى صندوق واحد، مع حالة جاهزية واضحة لكل قناة.
            </p>
            <div className="mt-4 grid gap-2">
              {["واتساب: رقم Business وإرسال رسائل", "إنستجرام: DMs من حساب Professional", "ماسنجر: رسائل صفحة Facebook"].map((item) => (
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
          <AlertTitle>وضع الاختبار المحلي مفعّل</AlertTitle>
          <AlertDescription>هذه البيئة لا ترسل رسائل واتساب حقيقية، لكن خطوات الإعداد نفسها.</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-[1.32fr_0.68fr]">
        <div className="space-y-4 sm:space-y-5">
          <section className="grid gap-3 sm:grid-cols-2">
            <ConnectionModeCard
              active
              badge="الأفضل للمستخدمين"
              body="استخدمي رقم النشاط الحقيقي الذي سيراسله العملاء. بعد اعتماد الرقم من Meta لن تحتاجي لإضافة كل عميل يدويًا."
              icon={CheckCircle2}
              title="رقم واتساب إنتاجي"
            />
            <ConnectionModeCard
              badge="للتجربة فقط"
              body="مفيد لاختبار الـ webhook، لكن Meta تسمح بالرد فقط على الأرقام المضافة كمستلمين تجريبيين."
              icon={AlertTriangle}
              title="رقم Meta التجريبي"
            />
          </section>

          <section className="rounded-[22px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px] sm:p-5">
            <div className="grid gap-2.5 sm:grid-cols-3 sm:gap-3">
              <StepSummary
                icon={RadioTower}
                step="١. قناة واتساب"
                description="حددي رقم واتساب التجاري الذي سيديره المساعد."
              />
              <StepSummary
                icon={KeyRound}
                step="٢. بيانات Meta"
                description="ضعي معرّف الرقم، معرّف حساب واتساب التجاري، والتوكن."
              />
              <StepSummary
                icon={ShieldCheck}
                step="٣. تحقق وحفظ"
                description="يتحقق kallem من الحساب، يجهّز استقبال الرسائل، ويحفظ التوكن بأمان."
              />
            </div>
          </section>

          <section className="rounded-[22px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px] sm:p-5">
            <div className="space-y-2">
              <p className="text-body-sm font-semibold text-wa-gray-900">رقم صاحب النشاط <span className="font-medium text-wa-gray-400">(اختياري)</span></p>
              <p className="text-body-sm text-wa-gray-600">
                احفظي رقم صاحب النشاط فقط إذا أردتِ أوامر المالك مثل <code className="ltr inline-block">stop</code> و <code className="ltr inline-block">resume</code> أن تعمل بوضوح مع الرقم المتصل.
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
              <summary className="cursor-pointer text-body-sm font-medium text-wa-blue-600">استخدام إعداد Meta الموجّه بدلًا من ذلك</summary>
              <div className="mt-4 space-y-4">
                <div className="rounded-xl bg-wa-gray-50 p-4 text-body-sm text-wa-gray-600">
                  هذه البيئة تدعم نافذة Meta الموجّهة إذا كان الحساب مؤهلًا. الإعداد اليدوي بالأعلى هو المسار الأكثر وضوحًا إذا كانت بيانات Meta متاحة لديك.
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
                <p className="text-body-sm font-semibold text-wa-gray-900">ما الذي يحتاجه النشاط؟</p>
                <div className="mt-3 space-y-3">
                  {[
                    "صلاحية الوصول إلى Meta Business الذي يملك رقم واتساب.",
                    "معرّف رقم واتساب ومعرّف حساب الأعمال من Meta.",
                    "رمز ربط من Meta بصلاحيات واتساب للأعمال.",
                    "للعملاء الحقيقيين: رقم واتساب إنتاجي، وليس رقم Meta التجريبي +1 555.",
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
            <p className="mt-4 text-body-sm font-semibold text-wa-gray-900">لماذا هذا الإعداد آمن؟</p>
            <p className="mt-2 text-body-sm leading-6 text-wa-gray-700">
              التطبيق يتحقق من الرقم والحساب أولًا، ولا يحفظ التوكن مشفرًا إلا بعد نجاح التحقق، ثم يجهّز استقبال الرسائل داخل صندوق الوارد.
            </p>
          </section>

          <section className="rounded-[22px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px] sm:p-5">
            <Bot className="size-5 text-wa-blue-600 sm:size-6" aria-hidden="true" />
            <p className="mt-4 text-body-sm font-semibold text-wa-gray-900">ماذا بعد الربط؟</p>
            <p className="mt-2 text-body-sm text-wa-gray-600">
              بعد التحقق ستظهر شاشة مركز القنوات. من هناك يمكنك تشغيل أو إيقاف الردود الذكية، مراجعة الرسائل، وإضافة إنستجرام وماسنجر من مكان واحد.
            </p>
          </section>

          <section className="rounded-[22px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px] sm:p-5">
            <MessageSquareText className="size-5 text-wa-blue-600 sm:size-6" aria-hidden="true" />
            <p className="mt-4 text-body-sm font-semibold text-wa-gray-900">رابط استقبال الرسائل</p>
            <code className="ltr mt-3 block overflow-x-auto rounded-xl border border-wa-gray-100 bg-wa-gray-50 px-3 py-3 text-left font-mono text-mono text-wa-gray-600">
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

type ConnectionModeCardProps = {
  active?: boolean;
  badge: string;
  body: string;
  icon: typeof Building2;
  title: string;
};

function ConnectionModeCard({ active = false, badge, body, icon: Icon, title }: ConnectionModeCardProps) {
  return (
    <div
      className={
        active
          ? "rounded-[22px] border border-wa-blue-100 bg-wa-blue-50 p-4 shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px] sm:p-5"
          : "rounded-[22px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px] sm:p-5"
      }
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white text-wa-blue-600 shadow-[0_10px_28px_rgba(13,20,33,0.05)]">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div>
          <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-wa-blue-700">
            {badge}
          </span>
          <p className="mt-3 text-body font-semibold text-wa-gray-900">{title}</p>
          <p className="mt-1 text-body-sm leading-6 text-wa-gray-600">{body}</p>
        </div>
      </div>
    </div>
  );
}
