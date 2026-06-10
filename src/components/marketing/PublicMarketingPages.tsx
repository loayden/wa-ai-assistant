// FILE: src/components/marketing/PublicMarketingPages.tsx
/*
 * [ROLE: FRONTEND ENGINEER + PRODUCT DESIGNER]
 * Decision: Phase 6 public pages share one conversion-focused system so the
 * buying journey stays short, Arabic-first, and consistent with the app UI.
 */
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  GitCompareArrows,
  LockKeyhole,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

import { AppFooter } from "@/components/shared/AppFooter";
import { LogoMark } from "@/components/shared/LogoMark";
import { cn } from "@/lib/utils";
import {
  channelPages,
  comparisonPages,
  featurePages,
  getPublicPaymentModeCopy,
  getPublicPlanCards,
  publicMarketingRoutes,
  publicNavItems,
  trustSignals,
  type PublicPlanCard,
} from "@/lib/marketing/public-positioning";
import type { PaymobMode } from "@/lib/paymob/mode";

type ChannelPageKey = keyof typeof channelPages;
type ComparisonPageKey = keyof typeof comparisonPages;
type FeaturePageKey = keyof typeof featurePages;

const sharedPublicHeroPhoto =
  "https://images.pexels.com/photos/7709227/pexels-photo-7709227.jpeg?auto=compress&cs=tinysrgb&w=1400";

function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 px-2 py-2 sm:px-4">
      <nav className="glass-surface mx-auto flex max-w-[1160px] items-center justify-between gap-3 rounded-[24px] px-3 py-3 sm:px-5">
        <Link href="/" className="inline-flex items-center" aria-label="kallem home">
          <LogoMark size="lg" />
        </Link>
        <div className="hidden items-center gap-1 rounded-full border border-white/70 bg-white/50 p-1 lg:flex">
          {publicNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-2 text-sm font-medium text-wa-gray-600 transition hover:bg-white/80 hover:text-wa-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wa-blue-600"
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden min-h-10 items-center rounded-full px-4 text-sm font-semibold text-wa-gray-600 transition hover:bg-wa-gray-50 sm:inline-flex"
          >
            تسجيل الدخول
          </Link>
          <Link
            href="/signup"
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-wa-blue-600 px-4 text-sm font-semibold text-white shadow-[0_14px_36px_rgba(26,86,255,0.18)] transition hover:bg-[#0E47E8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wa-blue-600 sm:min-h-11 sm:px-5"
          >
            ابدأ مجانًا
          </Link>
        </div>
      </nav>
    </header>
  );
}

function PublicShell({ children }: { children: ReactNode }) {
  return (
    <main className="app-glass-background min-h-screen text-wa-gray-900">
      <div className="pointer-events-none fixed inset-0 opacity-24 [background-image:linear-gradient(rgba(255,255,255,.16)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.14)_1px,transparent_1px)] [background-size:72px_72px]" />
      <div className="public-glass-pages relative">
      <PublicHeader />
      {children}
      <AppFooter />
      </div>
    </main>
  );
}

function PrimaryCta({
  children,
  className,
  href,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  className?: string;
  variant?: "primary" | "secondary";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wa-blue-600",
        variant === "primary"
          ? "bg-wa-blue-600 text-white shadow-[0_18px_44px_rgba(26,86,255,0.22)] hover:bg-[#0E47E8]"
          : "glass-control text-wa-gray-900 hover:bg-white/90",
        className,
      )}
    >
      {children}
    </Link>
  );
}

function HeroVisual({ asset, title }: { asset: string; title: string }) {
  return (
    <div className="glass-surface relative overflow-hidden rounded-[28px] p-4 sm:rounded-[34px] sm:p-5">
      <div className="absolute inset-x-0 top-0 h-36 bg-[linear-gradient(180deg,rgba(26,86,255,0.12),transparent)]" />
      <div className="relative rounded-[24px] border border-white/62 bg-white/54 p-4 sm:p-5">
        <div className="relative mb-4 h-48 overflow-hidden rounded-[20px] border border-wa-gray-100 sm:h-56">
          <Image
            src={sharedPublicHeroPhoto}
            alt="فريق دعم عملاء يتابع رسائل السوشيال من لوحة واحدة"
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 520px"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,20,33,0.02),rgba(13,20,33,0.62))]" />
          <div className="absolute inset-x-3 bottom-3 rounded-2xl border border-white/50 bg-white/90 p-3 text-sm font-semibold leading-6 text-wa-gray-900 shadow-[0_18px_48px_rgba(13,20,33,0.14)] backdrop-blur">
            إدارة القنوات الثلاثة من نفس تجربة kallem.
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-wa-gray-400">صورة تشغيلية من قيمة المنتج</p>
            <h2 className="mt-1 max-w-[320px] text-xl font-semibold leading-tight text-wa-gray-900">{title}</h2>
          </div>
          <Image src={asset} alt="" width={104} height={104} className="size-20 shrink-0 object-contain sm:size-24" priority />
        </div>
        <div className="mt-5 grid gap-3">
          {[
            { label: "القناة", value: "تُفحص قبل التشغيل", tone: "blue" },
            { label: "الرد", value: "من معلومات النشاط", tone: "success" },
            { label: "الفشل", value: "سبب وفعل واضح", tone: "warning" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3 rounded-2xl border border-wa-gray-100 bg-white p-3">
              <span className="text-sm font-medium text-wa-gray-600">{item.label}</span>
              <span
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold",
                  item.tone === "success" && "bg-wa-success-bg text-wa-success",
                  item.tone === "warning" && "bg-wa-warning-bg text-wa-warning",
                  item.tone === "blue" && "bg-wa-blue-50 text-wa-blue-600",
                )}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div className="max-w-[760px]">
      <p className="text-sm font-semibold text-wa-blue-600">{eyebrow}</p>
      <h2 className="mt-3 text-[30px] font-semibold leading-tight text-wa-gray-900 sm:text-[44px] sm:leading-[1.12]">{title}</h2>
      <p className="mt-4 text-body-sm leading-6 text-wa-gray-600 sm:text-body-lg">{body}</p>
    </div>
  );
}

function PlanCards({ compact = false }: { compact?: boolean }) {
  const plans = getPublicPlanCards();

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {plans.map((plan) => (
        <PlanCard key={plan.tier} plan={plan} compact={compact} />
      ))}
    </div>
  );
}

function PlanCard({ compact, plan }: { compact: boolean; plan: PublicPlanCard }) {
  return (
    <section
      className={cn(
        "relative flex flex-col rounded-[24px] border border-wa-gray-100 bg-white p-4 shadow-[0_18px_54px_rgba(13,20,33,0.055)] sm:rounded-[30px] sm:p-6",
        plan.recommended && "border-wa-blue-600 ring-4 ring-wa-blue-50",
      )}
    >
      {plan.recommended ? (
        <span className="absolute left-4 top-4 rounded-full bg-wa-blue-600 px-3 py-1 text-xs font-semibold text-white">الأكثر مناسبة</span>
      ) : null}
      <p className="text-sm font-semibold text-wa-blue-600">{plan.title}</p>
      <div className="mt-5">
        <p className="text-[34px] font-semibold leading-none text-wa-gray-900 sm:text-[46px]">{plan.priceLabel}</p>
        <p className="mt-3 text-body-sm leading-6 text-wa-gray-600">{plan.description}</p>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <Metric label="الردود" value={plan.replyLimit} />
        <Metric label="القنوات" value={plan.channelLimit} />
      </div>
      {!compact ? <p className="mt-4 rounded-2xl bg-wa-gray-50 p-3 text-sm font-semibold leading-6 text-wa-gray-700">{plan.bestFor}</p> : null}
      <div className="mt-5 space-y-3">
        {plan.features.map((feature) => (
          <p key={feature} className="flex items-start gap-2 text-sm leading-6 text-wa-gray-600">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-wa-blue-600" aria-hidden="true" />
            {feature}
          </p>
        ))}
      </div>
      <PrimaryCta href={plan.ctaHref} className="mt-6 sm:mt-auto">
        {plan.ctaLabel}
        <ArrowLeft className="size-4" aria-hidden="true" />
      </PrimaryCta>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-3">
      <p className="text-xs text-wa-gray-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-wa-gray-900">{value}</p>
    </div>
  );
}

function TrustGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {trustSignals.map((signal) => (
        <div key={signal.title} className="rounded-[22px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:p-5">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-wa-blue-50 text-wa-blue-600">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-wa-gray-900">{signal.title}</h3>
          <p className="mt-2 text-body-sm leading-6 text-wa-gray-600">{signal.body}</p>
        </div>
      ))}
    </div>
  );
}

function PaymentModeBanner({ mode }: { mode: PaymobMode }) {
  const copy = getPublicPaymentModeCopy(mode);

  return (
    <div
      className={cn(
        "rounded-[22px] border p-4 sm:p-5",
        copy.tone === "success" ? "border-wa-success/25 bg-wa-success-bg text-wa-success" : "border-wa-warning/25 bg-wa-warning-bg text-wa-warning",
      )}
    >
      <div className="flex items-start gap-3">
        {copy.tone === "success" ? <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" /> : <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />}
        <div>
          <h2 className="text-base font-semibold">{copy.title}</h2>
          <p className="mt-1 text-sm leading-6">{copy.body}</p>
        </div>
      </div>
    </div>
  );
}

function LocalPriceAlert() {
  return (
    <div className="rounded-[24px] border border-wa-blue-100 bg-wa-blue-50 p-4 text-wa-blue-900 sm:p-5">
      <div className="flex items-start gap-3">
        <GitCompareArrows className="mt-0.5 size-5 shrink-0 text-wa-blue-700" aria-hidden="true" />
        <div>
          <h2 className="text-base font-semibold">قارن السعر حسب قيمة التشغيل، وليس عدد المميزات فقط.</h2>
          <p className="mt-2 text-body-sm leading-6 text-wa-blue-900/80">
            kallem يوضح عدد الردود والقنوات بالجنيه المصري قبل التسجيل. إذا قارنت مع أدوات عالمية، احسب تكلفة الفريق، التعريب، إعداد Meta، وتشخيص فشل الردود، وليس الاشتراك الشهري وحده.
          </p>
        </div>
      </div>
    </div>
  );
}

export function ChannelMarketingPage({ pageKey }: { pageKey: ChannelPageKey }) {
  const page = channelPages[pageKey];

  return (
    <PublicShell>
      <section className="mx-auto grid max-w-[1160px] gap-8 px-3 py-10 sm:px-6 sm:py-16 lg:grid-cols-[0.98fr_1.02fr] lg:items-center lg:py-20">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-wa-blue-100 bg-wa-blue-50 px-3 py-2 text-xs font-semibold text-wa-blue-600">
            <Sparkles className="size-4" aria-hidden="true" />
            {page.eyebrow}
          </div>
          <h1 className="mt-5 max-w-[720px] text-[38px] font-semibold leading-[1.08] text-wa-gray-900 sm:text-[62px] sm:leading-[1.04]">
            {page.title}
          </h1>
          <p className="mt-5 max-w-[680px] text-body leading-7 text-wa-gray-600 sm:text-xl sm:leading-8">{page.body}</p>
          <div className="mt-7 grid gap-3 sm:flex">
            <PrimaryCta href={page.primaryHref}>
              {page.primaryCta}
              <ArrowLeft className="size-4" aria-hidden="true" />
            </PrimaryCta>
            <PrimaryCta href={page.secondaryHref} variant="secondary">
              {page.secondaryCta}
            </PrimaryCta>
          </div>
        </div>
        <HeroVisual asset={page.asset} title="الردود لا تعمل إلا عندما تكون القناة جاهزة فعلاً" />
      </section>

      <section className="border-y border-wa-gray-100 bg-wa-gray-50/75 py-12 sm:py-16">
        <div className="mx-auto max-w-[1160px] px-3 sm:px-6">
          <SectionTitle
            eyebrow="المسار العملي"
            title="ما الذي يستطيع صاحب النشاط عمله بسرعة؟"
            body="كل صفحة عامة تشرح نتيجة تشغيلية واضحة، ثم ترسل المستخدم إلى نفس مسار التطبيق: تسجيل، ربط، اختبار، ثم تشغيل."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {page.useCases.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-[22px] border border-wa-gray-100 bg-white p-4">
                <MessageSquareText className="mt-1 size-5 shrink-0 text-wa-blue-600" aria-hidden="true" />
                <p className="text-body-sm leading-6 text-wa-gray-700">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1160px] px-3 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <SectionTitle
            eyebrow="جاهزية قبل البيع"
            title="لا نشغل ردود عامة قبل أن نعرف ما ينقص القناة."
            body="هذه هي الفحوصات التي تظهر في المنتج للمستخدم حتى لا يظن أن القناة جاهزة وهي لا تزال في وضع تجربة أو تحتاج مراجعة."
          />
          <div className="grid gap-3">
            {page.readiness.map((item) => (
              <div key={item} className="flex items-center justify-between gap-4 rounded-2xl border border-wa-gray-100 bg-white p-4 shadow-[0_10px_30px_rgba(13,20,33,0.035)]">
                <span className="text-sm font-semibold text-wa-gray-900">{item}</span>
                <span className="rounded-full bg-wa-blue-50 px-3 py-1.5 text-xs font-semibold text-wa-blue-600">يفحصه kallem</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1160px] px-3 pb-12 sm:px-6 sm:pb-16">
        <PlanCards compact />
      </section>
    </PublicShell>
  );
}

export function PublicPricingPage({ paymobMode }: { paymobMode: PaymobMode }) {
  return (
    <PublicShell>
      <section className="mx-auto max-w-[1160px] px-3 py-10 sm:px-6 sm:py-16">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.62fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold text-wa-blue-600">الأسعار</p>
            <h1 className="mt-3 max-w-[780px] text-[38px] font-semibold leading-[1.08] text-wa-gray-900 sm:text-[64px] sm:leading-[1.04]">
              خطط واضحة بالجنيه المصري، بدون كلمة Unlimited.
            </h1>
            <p className="mt-5 max-w-[760px] text-body leading-7 text-wa-gray-600 sm:text-xl sm:leading-8">
              كل خطة تعرض عدد الردود والقنوات بوضوح. الدفع يفتح فقط عندما يكون Paymob في وضع الإنتاج حتى لا يدفع عميل حقيقي في بيئة اختبار.
            </p>
          </div>
          <div className="space-y-3">
            <PaymentModeBanner mode={paymobMode} />
            <div className="flex items-center gap-4 rounded-[24px] border border-wa-gray-100 bg-wa-gray-50 p-4">
              <Image
                src={sharedPublicHeroPhoto}
                alt="فريق يتابع رسائل العملاء قبل اختيار خطة kallem"
                width={112}
                height={112}
                className="size-20 shrink-0 rounded-2xl object-cover"
              />
              <p className="text-body-sm leading-6 text-wa-gray-700">
                السعر واضح قبل التسجيل، وبعدها ينتقل المستخدم إلى الفوترة أو ربط القنوات بدون مسار طويل.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-8">
          <PlanCards />
        </div>
        <div className="mt-5">
          <LocalPriceAlert />
        </div>
      </section>

      <section className="border-y border-wa-gray-100 bg-wa-gray-50/75 py-12 sm:py-16">
        <div className="mx-auto max-w-[1160px] px-3 sm:px-6">
          <SectionTitle
            eyebrow="رحلة شراء قصيرة"
            title="من السعر إلى الدفع في أقل خطوات ممكنة."
            body="اختر الخطة، سجل الدخول أو أنشئ حسابًا، ثم افتح الفوترة. إذا كان الدفع الإنتاجي غير جاهز، تظهر رسالة واضحة بدل زر مكسور."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["اختيار خطة", "الحدود والسعر ظاهرة قبل التسجيل."],
              ["إنشاء حساب", "التسجيل يرسل المستخدم مباشرة إلى الفوترة أو الربط."],
              ["دفع Paymob", "بيانات البطاقة لا تدخل kallem أبدًا."],
            ].map(([title, body], index) => (
              <div key={title} className="rounded-[22px] border border-wa-gray-100 bg-white p-5 shadow-[0_14px_42px_rgba(13,20,33,0.04)]">
                <span className="text-sm font-semibold text-wa-gray-300">{String(index + 1).padStart(2, "0")}</span>
                <h2 className="mt-3 text-xl font-semibold text-wa-gray-900">{title}</h2>
                <p className="mt-2 text-body-sm leading-6 text-wa-gray-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicShell>
  );
}

export function SecurityTrustPage() {
  return (
    <PublicShell>
      <section className="mx-auto max-w-[1160px] px-3 py-10 sm:px-6 sm:py-16 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold text-wa-blue-600">الأمان والثقة</p>
            <h1 className="mt-3 max-w-[780px] text-[38px] font-semibold leading-[1.08] text-wa-gray-900 sm:text-[64px] sm:leading-[1.04]">
              kallem لا يخفي حالة القنوات أو الدفع عن صاحب النشاط.
            </h1>
            <p className="mt-5 max-w-[720px] text-body leading-7 text-wa-gray-600 sm:text-xl sm:leading-8">
              الثقة هنا ليست شعارات. المنتج يوضح ما يعمل، ما يحتاج إعدادًا يدويًا، وما لا يصلح للعملاء الحقيقيين بعد.
            </p>
            <div className="mt-7 grid gap-3 sm:flex">
              <PrimaryCta href="/signup?next=%2Freadiness">
                افحص جاهزية نشاطك
                <ArrowLeft className="size-4" aria-hidden="true" />
              </PrimaryCta>
              <PrimaryCta href="/privacy" variant="secondary">
                سياسة الخصوصية
              </PrimaryCta>
            </div>
          </div>
          <div className="rounded-[28px] border border-wa-gray-100 bg-wa-gray-900 p-4 text-white shadow-[0_24px_72px_rgba(13,20,33,0.14)] sm:p-5">
            <div className="rounded-[24px] bg-white p-5 text-wa-gray-900">
              <div className="mb-2 flex items-center gap-4 rounded-2xl bg-wa-gray-50 p-3">
                <Image
                  src={sharedPublicHeroPhoto}
                  alt="فريق دعم يتابع حالة القنوات والردود"
                  width={112}
                  height={112}
                  className="size-20 shrink-0 rounded-2xl object-cover"
                />
                <p className="text-body-sm font-semibold leading-6 text-wa-gray-800">
                  الثقة تبدأ من توضيح الحالة الحقيقية للردود والقنوات قبل البيع.
                </p>
              </div>
              {[
                { icon: LockKeyhole, label: "Tokens", value: "مشفرة ولا تظهر للعميل" },
                { icon: ShieldCheck, label: "Readiness", value: "يفصل التجربة عن الإنتاج" },
                { icon: CreditCard, label: "Paymob", value: "test/live قبل checkout" },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.label} className="flex items-center gap-3 border-b border-wa-gray-100 py-4 last:border-b-0">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-wa-blue-50 text-wa-blue-600">
                      <Icon className="size-5" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-wa-gray-900">{item.label}</p>
                      <p className="mt-1 text-body-sm text-wa-gray-600">{item.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-wa-gray-100 bg-wa-gray-50/75 py-12 sm:py-16">
        <div className="mx-auto max-w-[1160px] px-3 sm:px-6">
          <TrustGrid />
        </div>
      </section>
    </PublicShell>
  );
}

export function ComparisonMarketingPage({ pageKey }: { pageKey: ComparisonPageKey }) {
  const page = comparisonPages[pageKey];

  return (
    <PublicShell>
      <section className="mx-auto max-w-[1160px] px-3 py-10 sm:px-6 sm:py-16 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-[0.96fr_1.04fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-wa-blue-100 bg-wa-blue-50 px-3 py-2 text-xs font-semibold text-wa-blue-600">
              <GitCompareArrows className="size-4" aria-hidden="true" />
              مقارنة مع {page.competitorName}
            </div>
            <h1 className="mt-5 max-w-[800px] text-[36px] font-semibold leading-[1.08] text-wa-gray-900 sm:text-[60px] sm:leading-[1.04]">
              {page.title}
            </h1>
            <p className="mt-5 max-w-[720px] text-body leading-7 text-wa-gray-600 sm:text-xl sm:leading-8">{page.body}</p>
            <div className="mt-7 grid gap-3 sm:flex">
              <PrimaryCta href="/signup">
                جرّب kallem
                <ArrowLeft className="size-4" aria-hidden="true" />
              </PrimaryCta>
              <PrimaryCta href={publicMarketingRoutes.pricing} variant="secondary">
                عرض الأسعار
              </PrimaryCta>
            </div>
          </div>
          <HeroVisual asset="/assets/3dicons/chat-text-dynamic-color.png" title="kallem يركز على الجاهزية والوضوح بدل تعقيد المنصات الواسعة" />
        </div>
      </section>

      <section className="border-y border-wa-gray-100 bg-wa-gray-50/75 py-12 sm:py-16">
        <div className="mx-auto max-w-[1160px] px-3 sm:px-6">
          <div className="overflow-hidden rounded-[24px] border border-wa-gray-100 bg-white shadow-[0_18px_54px_rgba(13,20,33,0.05)]">
            <div className="grid grid-cols-[0.7fr_1fr_1fr] border-b border-wa-gray-100 bg-wa-gray-50 text-sm font-semibold text-wa-gray-700">
              <div className="p-4 sm:p-5">المعيار</div>
              <div className="p-4 text-center sm:p-5">{page.competitorName}</div>
              <div className="bg-wa-blue-50 p-4 text-center text-wa-blue-700 sm:p-5">kallem</div>
            </div>
            {page.rows.map((row) => (
              <div key={row.area} className="grid grid-cols-[0.7fr_1fr_1fr] border-b border-wa-gray-100 last:border-b-0">
                <div className="p-4 text-sm font-semibold text-wa-gray-900 sm:p-5">{row.area}</div>
                <div className="p-4 text-body-sm leading-6 text-wa-gray-600 sm:p-5">{row.competitor}</div>
                <div className="bg-wa-blue-50/50 p-4 text-body-sm font-medium leading-6 text-wa-gray-800 sm:p-5">{row.kallem}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1160px] px-3 py-12 sm:px-6 sm:py-16">
        <TrustGrid />
      </section>
    </PublicShell>
  );
}

export function FeatureMarketingPage({ pageKey }: { pageKey: FeaturePageKey }) {
  const page = featurePages[pageKey];

  return (
    <PublicShell>
      <section className="mx-auto grid max-w-[1160px] gap-8 px-3 py-10 sm:px-6 sm:py-16 lg:grid-cols-[0.98fr_1.02fr] lg:items-center lg:py-20">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-wa-blue-100 bg-wa-blue-50 px-3 py-2 text-xs font-semibold text-wa-blue-600">
            <Sparkles className="size-4" aria-hidden="true" />
            {page.eyebrow}
          </div>
          <h1 className="mt-5 max-w-[760px] text-[38px] font-semibold leading-[1.08] text-wa-gray-900 sm:text-[62px] sm:leading-[1.04]">
            {page.title}
          </h1>
          <p className="mt-5 max-w-[700px] text-body leading-7 text-wa-gray-600 sm:text-xl sm:leading-8">{page.body}</p>
          <div className="mt-7 grid gap-3 sm:flex">
            <PrimaryCta href={page.primaryHref}>
              {page.primaryCta}
              <ArrowLeft className="size-4" aria-hidden="true" />
            </PrimaryCta>
            <PrimaryCta href={page.secondaryHref} variant="secondary">
              {page.secondaryCta}
            </PrimaryCta>
          </div>
        </div>
        <HeroVisual asset={page.asset} title="كل خطوة في المنتج توضّح الحالة والفعل التالي" />
      </section>

      <section className="border-y border-wa-gray-100 bg-wa-gray-50/75 py-12 sm:py-16">
        <div className="mx-auto max-w-[1160px] px-3 sm:px-6">
          <SectionTitle
            eyebrow="وضوح التشغيل"
            title="المستخدم يعرف ما يحدث خلال ثوانٍ."
            body="لا توجد طبقات تقنية غير مفهومة. كل feature تعرض قيمة عملية، حالة واضحة، وخطوة تالية واحدة."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {page.highlights.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-[22px] border border-wa-gray-100 bg-white p-4">
                <CheckCircle2 className="mt-1 size-5 shrink-0 text-wa-blue-600" aria-hidden="true" />
                <p className="text-body-sm leading-6 text-wa-gray-700">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1160px] px-3 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <SectionTitle
            eyebrow="رحلة قصيرة"
            title="من الإعداد إلى التشغيل بدون شاشة زائدة."
            body="كل خطوة تقرب صاحب النشاط من ردود آمنة ودقيقة، ثم صفحة الجاهزية تفصل ما يعمل الآن عما يحتاج إعدادًا خارجيًا."
          />
          <div className="grid gap-3">
            {page.workflow.map((step, index) => (
              <div key={step} className="flex items-center gap-4 rounded-2xl border border-wa-gray-100 bg-white p-4 shadow-[0_10px_30px_rgba(13,20,33,0.035)]">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-wa-blue-50 text-sm font-semibold text-wa-blue-600">
                  {index + 1}
                </span>
                <span className="text-sm font-semibold text-wa-gray-900">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1160px] px-3 pb-12 sm:px-6 sm:pb-16">
        <PlanCards compact />
      </section>
    </PublicShell>
  );
}
