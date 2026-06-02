// FILE: src/components/billing/BillingPageClient.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Billing uses hosted Paymob checkout from the API so card data never
 * touches the application frontend.
 */
"use client";

import type { ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Gift, LockKeyhole, Minus, ReceiptText, ShieldCheck } from "lucide-react";

import { PlanCard } from "@/components/billing/PlanCard";
import { SubscriptionStatus } from "@/components/billing/SubscriptionStatus";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubscription } from "@/hooks/useSubscription";
import { apiData } from "@/lib/api/client";
import { translateError } from "@/lib/errors/translateError";
import { PLAN_LIMITS, type PlanTier } from "@/types/subscription";

type RedirectResponse = {
  url: string;
};

type PaidPlanTier = Extract<PlanTier, "PRO" | "BUSINESS">;
type PaymobMode = "live" | "test" | "missing";
type BillingPageClientProps = {
  isAdmin: boolean;
  paymobMode: PaymobMode;
};

const planCopy: Record<
  PlanTier,
  {
    description: string;
    features: string[];
    useCase: string;
    overageLabel: string;
    recommended?: boolean;
  }
> = {
  FREE: {
    description: "مناسبة لتجربة المساعد على عدد قليل من الرسائل.",
    features: ["سلوك مساعد افتراضي", "وصول أساسي لصندوق الرسائل", "إعداد واتساب موجّه"],
    useCase: "الأفضل للتجربة الأولى",
    overageLabel: "يتوقف بعد 50 رد",
  },
  PRO: {
    description: "للأنشطة الصغيرة النشطة التي تحتاج ردود يومية من المساعد.",
    features: ["تعليمات خاصة للمساعد", "حتى 3 أرقام واتساب", "متابعة واضحة بعد الردود المتاحة"],
    useCase: "الأفضل للنشاط المتنامي",
    overageLabel: "متابعة بعد 2,000 رد",
    recommended: true,
  },
  BUSINESS: {
    description: "للفِرق التي تدير حجم محادثات أعلى وتحتاج مساحة تشغيل أكبر.",
    features: ["حد ردود أعلى", "حتى 10 أرقام متصلة", "أولوية دعم ومساحة تشغيل للفِرق"],
    useCase: "الأفضل للفِرق المشغولة",
    overageLabel: "متابعة بعد 10,000 رد",
  },
};

function formatReplies(count: number) {
  return `${count.toLocaleString("ar-EG")} رد / شهر`;
}

function getTrialDaysRemaining(trialEndsAt: string | null | undefined) {
  if (!trialEndsAt) {
    return 0;
  }

  return Math.max(Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)), 0);
}

const comparisonRows = [
  { label: "الردود شهرياً", free: "50", pro: "2,000", business: "10,000" },
  { label: "أرقام واتساب", free: "1", pro: "3", business: "10" },
  { label: "قاعدة المعرفة", free: true, pro: true, business: true },
  { label: "التحليلات", free: false, pro: true, business: true },
  { label: "استخراج العملاء المحتملين", free: false, pro: true, business: true },
  { label: "ساعات العمل", free: false, pro: true, business: true },
  { label: "قوالب الرسائل والحملات", free: false, pro: true, business: true },
  { label: "إدارة الطلبات", free: false, pro: true, business: true },
];

export function BillingPageClient({ isAdmin, paymobMode }: BillingPageClientProps) {
  const subscription = useSubscription();
  const searchParams = useSearchParams();
  const checkoutMutation = useMutation({
    mutationFn: (planTier: PaidPlanTier) =>
      apiData<RedirectResponse>("/api/billing/create-checkout", {
        method: "POST",
        body: JSON.stringify({ planTier }),
      }),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });

  if (subscription.isLoading) {
    return <BillingLoadingSkeleton />;
  }

  if (subscription.error) {
    return (
        <Alert className="border-wa-error bg-wa-error-bg">
          <AlertTitle>الفوترة غير متاحة الآن</AlertTitle>
        <AlertDescription>{translateError(subscription.error)}</AlertDescription>
        </Alert>
      );
  }

  if (!subscription.user) {
    return (
      <Alert className="border-wa-error bg-wa-error-bg">
        <AlertTitle>الفوترة غير متاحة الآن</AlertTitle>
        <AlertDescription>استجابة الإعدادات لا تحتوي على بيانات الخطة.</AlertDescription>
      </Alert>
    );
  }

  const user = subscription.user;
  const currentPlan = subscription.planTier;
  const isPaidPlan = subscription.isPaidPlan;
  const mutationError = checkoutMutation.error;
  const billingBusy = checkoutMutation.isPending;
  const paymentLocked = paymobMode !== "live";
  const checkoutStatus = searchParams.get("checkout");
  const trialDaysRemaining = getTrialDaysRemaining(user.trialEndsAt);

  function handlePlanAction(targetPlan: PlanTier) {
    if (targetPlan === currentPlan) {
      return;
    }

    if (targetPlan === "FREE") {
      return;
    }

    if (paymentLocked) {
      return;
    }

    checkoutMutation.mutate(targetPlan);
  }

  return (
    <div className="space-y-6">
      <SubscriptionStatus
        planTier={user.planTier}
        subscriptionStatus={user.subscriptionStatus}
        monthlyReplyCount={user.monthlyReplyCount}
      />
      {trialDaysRemaining > 0 ? (
        <section className="rounded-[22px] border border-wa-blue-100 bg-wa-blue-50 p-4 shadow-[0_14px_42px_rgba(37,99,235,0.08)] sm:rounded-[28px] sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-wa-blue-600 shadow-[0_10px_28px_rgba(13,20,33,0.05)]">
                <Gift className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-body font-semibold text-wa-gray-900">تجربة Pro المجانية شغالة الآن</p>
                <p className="mt-1 text-body-sm leading-6 text-wa-gray-600">
                  باقي {trialDaysRemaining} {trialDaysRemaining === 1 ? "يوم" : "أيام"} على انتهاء التجربة. Pro يفتح 2,000 رد شهرياً، التحليلات، العملاء المحتملين، وساعات العمل.
                </p>
              </div>
            </div>
            <Link
              href="#plans"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-wa-blue-600 px-5 text-body-sm font-semibold text-white shadow-[0_14px_32px_rgba(37,99,235,0.22)] transition hover:bg-wa-blue-700"
            >
              تثبيت Pro بـ 999 جنيه
            </Link>
          </div>
        </section>
      ) : null}
      {checkoutStatus === "success" ? (
        <Alert className="border-wa-success/30 bg-wa-success-bg text-wa-success">
          <AlertTitle>بدأ تحديث الخطة</AlertTitle>
          <AlertDescription>
            Paymob أكد عملية الدفع. سيتم تحديث خطتك تلقائياً بعد انتهاء معالجة webhook.
          </AlertDescription>
        </Alert>
      ) : null}
      {checkoutStatus === "paymob-return" ? (
        <Alert className="border-wa-blue-100 bg-wa-blue-50 text-wa-blue-700">
          <AlertTitle>جارٍ تأكيد الدفع</AlertTitle>
          <AlertDescription>
            رجعت من Paymob إلى kallem. سيتم تحديث الخطة تلقائياً بعد تأكيد الدفع.
          </AlertDescription>
        </Alert>
      ) : null}
      {checkoutStatus === "cancelled" ? (
        <Alert className="border-wa-gray-100 bg-white text-wa-gray-700">
          <AlertTitle>تم إلغاء الدفع</AlertTitle>
          <AlertDescription>لم يتم تغيير الخطة. يمكنك اختيار خطة مرة أخرى في أي وقت.</AlertDescription>
        </Alert>
      ) : null}
      {checkoutStatus === "failed" ? (
        <Alert className="border-wa-error bg-wa-error-bg">
          <AlertTitle>لم يكتمل الدفع</AlertTitle>
          <AlertDescription>
            Paymob لم يؤكد عملية دفع ناجحة. لم يتم تغيير الخطة ويمكنك المحاولة مرة أخرى بأمان.
          </AlertDescription>
        </Alert>
      ) : null}
      {mutationError ? (
        <Alert className="border-wa-error bg-wa-error-bg">
          <AlertTitle>فشل فتح دفع Paymob</AlertTitle>
          <AlertDescription>{mutationError.message}</AlertDescription>
        </Alert>
      ) : null}
      {paymentLocked ? (
        <Alert className="border-wa-warning bg-wa-warning-bg text-wa-warning">
          <AlertTriangle className="size-4" aria-hidden="true" />
          <AlertTitle>{paymobMode === "test" ? "الدفع في وضع الاختبار" : "الدفع غير جاهز"}</AlertTitle>
          <AlertDescription>
            {isAdmin
              ? "أزرار الترقية معطلة حتى يتم استبدال مفاتيح Paymob التجريبية بمفاتيح الإنتاج في Vercel."
              : "الترقية غير متاحة الآن. يمكن تجربة الخطة المجانية، وسنفعل الدفع عندما يكتمل إعداد بوابة الدفع."}
          </AlertDescription>
        </Alert>
      ) : null}

      <section id="plans" className="rounded-[22px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px] sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">الخطط</p>
            <h2 className="mt-2 text-[24px] font-semibold leading-tight text-wa-gray-900 sm:text-[28px]">اختاري حجم العمل الذي يديره المساعد.</h2>
            <p className="mt-2 max-w-[640px] text-body-sm leading-6 text-wa-gray-600">
              الأسعار بالجنيه المصري ومناسبة للأعمال الصغيرة. الترقية تفتح صفحة دفع آمنة من Paymob، وkallem لا يخزن أرقام البطاقات.
            </p>
          </div>
          {isPaidPlan ? <p className="rounded-full border border-wa-gray-100 bg-wa-gray-50 px-4 py-2 text-body-sm font-medium text-wa-gray-600">الخطة الحالية مفعّلة</p> : null}
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          {(Object.keys(PLAN_LIMITS) as PlanTier[]).map((plan) => {
            const limits = PLAN_LIMITS[plan];
            const copy = planCopy[plan];
            const isCurrent = currentPlan === plan;
            const isPaidTarget = plan !== "FREE";
            const actionLabel = isCurrent
              ? "الخطة الحالية"
              : plan === "FREE" && isPaidPlan
                ? "تواصل مع الدعم"
                : isPaidTarget
                  ? paymentLocked
                    ? "الدفع غير متاح الآن"
                    : isPaidPlan
                    ? `التبديل إلى ${plan}`
                    : `الترقية إلى ${plan}`
                  : "الخطة الحالية";

            return (
              <PlanCard
                key={plan}
                title={plan}
                priceLabel={limits.monthlyPriceEgp === 0 ? "مجاناً" : `${limits.monthlyPriceEgp.toLocaleString("ar-EG")} جنيه/شهر`}
                description={`${copy.useCase}. ${copy.description}`}
                includedRepliesLabel={formatReplies(limits.includedRepliesPerMonth)}
                numberLimitLabel={`${limits.maxConnections.toLocaleString("ar-EG")} ${limits.maxConnections === 1 ? "رقم" : "أرقام"}`}
                overageLabel={copy.overageLabel}
                features={copy.features}
                current={isCurrent}
                recommended={copy.recommended}
                actionLabel={billingBusy ? "جارٍ فتح Paymob..." : actionLabel}
                disabled={billingBusy || (isPaidTarget && paymentLocked) || (plan === "FREE" && isPaidPlan)}
                onAction={() => handlePlanAction(plan)}
              />
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-[22px] border border-wa-gray-100 bg-white shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px]">
        <div className="border-b border-wa-gray-100 p-4 sm:p-6">
          <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">مقارنة الخطط</p>
          <h2 className="mt-2 text-[24px] font-semibold leading-tight text-wa-gray-900 sm:text-[28px]">اعرف بالضبط ماذا تفتح كل خطة</h2>
          <p className="mt-2 max-w-[760px] text-body-sm leading-6 text-wa-gray-600">
            الفرق بين Free و Pro أقل من تكلفة عميل واحد إضافي في الشهر لمعظم الأنشطة. الهدف هو ألا يتوقف المساعد وقت ما الرسائل تزيد.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-wa-gray-50 text-wa-gray-600">
              <tr>
                <th className="px-4 py-4 text-right font-semibold sm:px-6">الميزة</th>
                <th className="px-4 py-4 text-center font-semibold">مجاني</th>
                <th className="px-4 py-4 text-center font-semibold text-wa-blue-700">Pro — 999 جنيه</th>
                <th className="px-4 py-4 text-center font-semibold">Business — 2,499 جنيه</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.label} className="border-t border-wa-gray-100">
                  <td className="px-4 py-4 font-medium text-wa-gray-900 sm:px-6">{row.label}</td>
                  <ComparisonCell value={row.free} active={currentPlan === "FREE"} />
                  <ComparisonCell value={row.pro} active={currentPlan === "PRO"} highlight />
                  <ComparisonCell value={row.business} active={currentPlan === "BUSINESS"} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <TrustCard
          icon={<ShieldCheck className="size-5" aria-hidden="true" />}
          title="الدفع يتم عبر Paymob"
          description="بيانات البطاقة تبقى داخل صفحة Paymob الآمنة. kallem يستقبل تأكيد الدفع فقط."
        />
        <TrustCard
          icon={<ReceiptText className="size-5" aria-hidden="true" />}
          title="الاستخدام واضح"
          description="الخطط المدفوعة تتابع الاستخدام بعد الردود المتاحة حتى تعرفي حجم الرسائل بدقة."
        />
        <TrustCard
          icon={<LockKeyhole className="size-5" aria-hidden="true" />}
          title="الحدود محمية من الخلفية"
          description="حدود الردود وأرقام واتساب يتم التحقق منها من الخادم وليس من الواجهة فقط."
        />
      </div>

      <Card className="overflow-hidden rounded-[22px] border-wa-gray-100 bg-white shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px]">
        <CardHeader className="border-b border-wa-gray-100 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">الإيصالات</p>
              <CardTitle className="mt-2 text-[24px] font-semibold">سجل الفوترة</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-4 sm:rounded-[22px] sm:p-5">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white text-wa-blue-600 shadow-[0_10px_28px_rgba(13,20,33,0.05)]">
                <ReceiptText className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-body-sm font-semibold text-wa-gray-900">
                  {isPaidPlan ? "إيصالات الدفع تتم عبر Paymob." : "لا توجد إيصالات مدفوعة بعد."}
                </p>
                <p className="mt-1 text-body-sm leading-6 text-wa-gray-600">
                  {isPaidPlan
                    ? "Paymob يؤكد المدفوعات عبر webhook آمن. يمكن إضافة فواتير ضريبية لاحقاً إذا احتاج النشاط لذلك."
                    : "ستظهر الإيصالات بعد ترقية الحساب إلى خطة مدفوعة."}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BillingLoadingSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="جارٍ تحميل الفوترة">
      <section className="rounded-[22px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px] sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <Skeleton className="h-16 w-full max-w-[220px] rounded-2xl" />
        </div>
      </section>
      <section className="rounded-[22px] border border-wa-gray-100 bg-white p-4 sm:rounded-[28px] sm:p-6">
        <div className="space-y-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-7 w-64 max-w-full" />
          <Skeleton className="h-4 w-[520px] max-w-full" />
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="rounded-[22px] border border-wa-gray-100 bg-white p-4 sm:rounded-[28px] sm:p-5">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="mt-5 h-10 w-44" />
              <div className="mt-5 space-y-3">
                <Skeleton className="h-14 rounded-2xl" />
                <Skeleton className="h-14 rounded-2xl" />
                <Skeleton className="h-14 rounded-2xl" />
              </div>
              <Skeleton className="mt-6 h-12 rounded-full" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ComparisonCell({ active, highlight = false, value }: { active?: boolean; highlight?: boolean; value: boolean | string }) {
  return (
    <td className={["px-4 py-4 text-center", highlight ? "bg-wa-blue-50/50" : "", active ? "font-semibold text-wa-blue-700" : "text-wa-gray-700"].join(" ")}>
      <span className={["inline-flex min-h-8 items-center justify-center gap-1 rounded-full px-3", active ? "bg-white ring-1 ring-wa-blue-200" : ""].join(" ")}>
        {typeof value === "boolean" ? (
          value ? (
            <CheckCircle2 className="size-4 text-wa-success" aria-label="Included" />
          ) : (
            <Minus className="size-4 text-wa-gray-300" aria-label="Not included" />
          )
        ) : (
          value
        )}
      </span>
    </td>
  );
}

function TrustCard({ description, icon, title }: { description: string; icon: ReactNode; title: string }) {
  return (
    <div className="rounded-[20px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.035)] sm:rounded-[24px] sm:p-5">
      <div className="flex size-10 items-center justify-center rounded-xl bg-wa-blue-50 text-wa-blue-600 sm:size-11 sm:rounded-2xl">{icon}</div>
      <p className="mt-4 text-body-sm font-semibold text-wa-gray-900">{title}</p>
      <p className="mt-2 text-body-sm leading-6 text-wa-gray-600">{description}</p>
    </div>
  );
}
