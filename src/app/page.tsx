import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Bot,
  CheckCircle2,
  Clock3,
  CreditCard,
  Inbox,
  Megaphone,
  MessageSquareText,
  Mic2,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  UserPlus,
  Zap,
} from "lucide-react";

import { AppFooter } from "@/components/shared/AppFooter";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import { CinematicScrollEffects } from "@/components/landing/CinematicScrollEffects";
import { MagneticLink } from "@/components/landing/MagneticLink";
import { MotionReveal } from "@/components/landing/MotionReveal";
import { SmoothScroll } from "@/components/landing/SmoothScroll";
import { BRAND_NAME, BRAND_NAME_AR } from "@/lib/utils/brand";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "واتساب", href: "/whatsapp-ai" },
  { label: "إنستجرام وماسنجر", href: "/instagram-messenger-ai" },
  { label: "الأسعار", href: "/pricing" },
  { label: "الأمان", href: "/security" },
  { label: "المقارنة", href: "/compare/respondio" },
];

const heroStats = [
  { label: "البدء", value: "مجاني" },
  { label: "اللغة", value: "عربي" },
  { label: "الدفع", value: "Paymob" },
  { label: "التحكم", value: "فوري" },
];

const workflowSteps = [
  {
    title: "اربط قنوات السوشيال",
    body: "ابدأ بأي قناة جاهزة، ثم أضف واتساب وإنستجرام وماسنجر عندما تكون الصلاحيات مكتملة.",
    icon: ShieldCheck,
  },
  {
    title: "علّم المساعد",
    body: "أضف وصف النشاط، الأسئلة الشائعة، ساعات العمل، المنتجات، والتعليمات الخاصة.",
    icon: BookOpen,
  },
  {
    title: "استقبل المحادثات",
    body: "العميل يرسل من واتساب أو إنستجرام أو ماسنجر. المساعد يرد، والمالك يراجع كل شيء من صندوق واحد.",
    icon: Inbox,
  },
  {
    title: "حوّل الرسائل لقيمة",
    body: "اكتشف Leads، سجل طلبات، أرسل روابط دفع، وتابع التحليلات من نفس اللوحة.",
    icon: BarChart3,
  },
];

const featureGroups = [
  {
    title: "ردود ذكية لكل قناة",
    body: "ردود تلقائية مبنية على معلومات نشاطك لواتساب وإنستجرام وماسنجر، مع إيقاف أو تسليم للبشر في أي وقت.",
    icon: Bot,
    href: "/connect",
  },
  {
    title: "قاعدة معرفة",
    body: "أدخل المنتجات، المواعيد، الأسعار، السياسات، والأسئلة الشائعة حتى لا تكون الردود عامة.",
    icon: BookOpen,
    href: "/knowledge",
  },
  {
    title: "صندوق وارد عملي",
    body: "صندوق موحد يوضح القناة، الرسائل الواردة والصادرة، حالة الذكاء، والتسليم اليدوي عند الحاجة.",
    icon: MessageSquareText,
    href: "/messages",
  },
  {
    title: "Leads وتحليلات",
    body: "اكتشاف العملاء المحتملين، متابعة المحادثات، ومعرفة أثر المساعد على نشاطك.",
    icon: UserPlus,
    href: "/leads",
  },
  {
    title: "ساعات عمل وتقييمات",
    body: "رسائل خارج الدوام، تقييم رضا العملاء بعد الإغلاق، وتنبيهات عند الحالات المهمة.",
    icon: Clock3,
    href: "/settings",
  },
  {
    title: "قوالب وحملات",
    body: "إدارة قوالب Meta المعتمدة وإرسال حملات منظمة مع احترام قواعد القنوات.",
    icon: Megaphone,
    href: "/templates",
  },
  {
    title: "طلبات ودفع",
    body: "استقبال طلبات من المحادثة، متابعة الحالة، وإرسال روابط دفع Paymob للعميل.",
    icon: ShoppingBag,
    href: "/orders",
  },
  {
    title: "صوت، عربيزي، وتصحيح",
    body: "فهم الرسائل الصوتية، Franco-Arabic، وتعلّم المساعد من تصحيحات صاحب النشاط.",
    icon: Mic2,
    href: "/corrections",
  },
];

const connectDetails = [
  "العميل لا يرى أي إعدادات تقنية. هو يرسل من القناة التي يعرفها.",
  "kallem يتحقق من اتصال كل قناة قبل تشغيل الردود عليها.",
  "القوالب والحملات تلتزم بقواعد Meta ونافذة خدمة العملاء.",
];

const pricingPlans = [
  {
    name: "FREE",
    price: "٠ جنيه",
    description: "لبداية آمنة وتجربة الردود على نشاط واحد.",
    replies: "٥٠ رد / شهر",
    numbers: "قناة واحدة",
    cta: "ابدأ مجانًا",
    href: "/signup",
    features: ["لوحة تحكم أساسية", "إعداد قناة موجّه", "تشغيل وإيقاف الردود"],
  },
  {
    name: "PRO",
    price: "٩٩٩ جنيه",
    description: "للأنشطة التي تستقبل رسائل يومية وتحتاج متابعة منظمة.",
    replies: "٢٬٠٠٠ رد / شهر",
    numbers: "حتى ٣ قنوات",
    cta: "اختر Pro",
    href: "/signup",
    featured: true,
    features: ["قاعدة معرفة", "Leads وتحليلات", "قوالب ورسائل متابعة", "ساعات عمل وتقييمات"],
  },
  {
    name: "BUSINESS",
    price: "٢٬٤٩٩ جنيه",
    description: "للعمليات الأكبر، فرق متعددة، وحجم محادثات أعلى.",
    replies: "١٠٬٠٠٠ رد / شهر",
    numbers: "حتى ١٠ قنوات",
    cta: "اختر Business",
    href: "/signup",
    features: ["قنوات متعددة", "حملات Broadcast", "طلبات ودفع", "أولوية دعم"],
  },
];

function BrandLockup({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("inline-flex items-baseline gap-2 text-xl font-semibold text-wa-gray-900", className)}
      aria-label="kallem home"
    >
      <span>{BRAND_NAME}</span>
      <span lang="ar" dir="rtl" className="text-wa-blue-600">
        {BRAND_NAME_AR}
      </span>
    </Link>
  );
}

function FormalCard({
  children,
  className,
  ...props
}: {
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[20px] border border-wa-gray-100 bg-white shadow-[0_18px_56px_rgba(13,20,33,0.06)] sm:rounded-[28px]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  body,
  className,
}: {
  eyebrow: string;
  title: string;
  body: string;
  className?: string;
}) {
  return (
    <div className={cn("max-w-[760px]", className)} data-cinema-reveal>
      <p className="text-sm font-semibold text-wa-blue-600">{eyebrow}</p>
      <h2 className="mt-3 text-[30px] font-semibold leading-tight text-wa-gray-900 sm:text-[48px] sm:leading-[1.12]">
        {title}
      </h2>
      <p className="mt-4 text-body-sm leading-6 text-wa-gray-600 sm:text-lg sm:leading-8">{body}</p>
    </div>
  );
}

function ProductPreview() {
  return (
    <FormalCard className="relative overflow-hidden p-3 sm:p-4" data-cinema-reveal>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_0%,rgba(26,86,255,0.13),transparent_36%),linear-gradient(180deg,rgba(247,247,248,0.35),rgba(255,255,255,0))]" />
      <div className="relative rounded-[18px] border border-wa-gray-100 bg-white p-3 sm:rounded-[24px] sm:p-4">
        <div className="flex items-center justify-between gap-3 border-b border-wa-gray-100 pb-3">
          <div>
            <p className="text-xs font-semibold text-wa-gray-400">مثال للواجهة</p>
            <h2 className="mt-1 text-xl font-semibold text-wa-gray-900 sm:text-2xl">المساعد يعمل الآن</h2>
          </div>
          <span className="inline-flex min-h-9 items-center rounded-full bg-wa-blue-600 px-3 text-xs font-semibold text-white">
            Replying
          </span>
        </div>

        <div className="grid gap-3 py-3 sm:grid-cols-3">
          {[
            { label: "الردود", value: "جاهزة" },
            { label: "Leads", value: "تلقائي" },
            { label: "طلبات", value: "منظم" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-3">
              <p className="text-xs text-wa-gray-400">{item.label}</p>
              <p className="mt-2 text-lg font-semibold text-wa-gray-900">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-[18px] border border-wa-gray-100 bg-wa-gray-50 p-3">
            <p className="text-xs font-semibold text-wa-gray-400">محادثة من السوشيال</p>
            <div className="mt-3 space-y-2">
              <div className="max-w-[86%] rounded-2xl rounded-tr-sm bg-white px-3 py-2 text-sm leading-6 text-wa-gray-700">
                عايز أعرف السعر والتوصيل؟
              </div>
              <div className="mr-auto max-w-[88%] rounded-2xl rounded-tl-sm bg-wa-blue-600 px-3 py-2 text-sm leading-6 text-white">
                أهلاً بك. التوصيل متاح داخل القاهرة، والسعر يبدأ من ١٢٠ جنيه حسب الطلب.
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {[
              { icon: UserPlus, label: "Lead جديد", value: "العميل يسأل عن السعر والتوصيل" },
              { icon: ShoppingBag, label: "طلب قابل للتسجيل", value: "يمكن تحويل المحادثة لطلب" },
              { icon: CreditCard, label: "رابط دفع", value: "Paymob جاهز للإرسال عند التأكيد" },
            ].map((row) => {
              const Icon = row.icon;

              return (
                <div key={row.label} className="flex gap-3 rounded-2xl border border-wa-gray-100 bg-white p-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-wa-blue-50 text-wa-blue-600">
                    <Icon className="size-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-wa-gray-900">{row.label}</p>
                    <p className="mt-1 text-xs leading-5 text-wa-gray-500">{row.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </FormalCard>
  );
}

function FeatureCard({ feature }: { feature: (typeof featureGroups)[number] }) {
  const Icon = feature.icon;

  return (
    <Link
      href={feature.href}
      className="group block rounded-[20px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_40px_rgba(13,20,33,0.04)] transition hover:-translate-y-0.5 hover:border-wa-blue-100 hover:shadow-[0_20px_56px_rgba(26,86,255,0.10)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wa-blue-600 sm:p-5"
      data-cinema-reveal
    >
      <div className="flex size-11 items-center justify-center rounded-2xl bg-wa-blue-50 text-wa-blue-600 transition group-hover:bg-wa-blue-600 group-hover:text-white">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-wa-gray-900">{feature.title}</h3>
      <p className="mt-2 text-body-sm leading-6 text-wa-gray-600">{feature.body}</p>
    </Link>
  );
}

function PromoVideoSection() {
  return (
    <section id="demo" className="relative z-10 mx-auto max-w-[1200px] px-3 pb-12 sm:px-6 sm:pb-16" data-cinema-section>
      <FormalCard className="overflow-hidden p-3 sm:p-5" data-cinema-reveal>
        <div className="grid gap-5 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <div className="px-2 py-3 sm:px-4 lg:py-6">
            <p className="text-sm font-semibold text-wa-blue-600">فيديو تعريفي</p>
            <h2 className="mt-3 text-[30px] font-semibold leading-tight text-wa-gray-900 sm:text-[46px] sm:leading-[1.12]">
              شاهد كيف يربط Kallem واتساب وإنستجرام وماسنجر بالذكاء الاصطناعي.
            </h2>
            <p className="mt-4 text-body-sm leading-6 text-wa-gray-600 sm:text-lg sm:leading-8">
              عرض سريع لمدة ٣٠ ثانية يوضح الربط السهل، الردود التلقائية، الصندوق الموحد، اكتشاف Leads، وتدريب المساعد بالعربية.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["ربط Meta", "واتساب", "إنستجرام", "ماسنجر", "Leads"].map((item) => (
                <span key={item} className="rounded-full border border-wa-gray-100 bg-wa-gray-50 px-3 py-2 text-xs font-semibold text-wa-gray-600">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[24px] border border-wa-gray-100 bg-wa-gray-900 shadow-[0_24px_70px_rgba(13,20,33,0.16)] sm:rounded-[32px]">
            <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_24%_0%,rgba(37,211,102,0.22),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.06),transparent_35%)]" />
            <video
              className="relative z-0 aspect-video w-full bg-wa-gray-900 object-cover"
              src="/videos/kallem-promo.mp4"
              poster="/videos/kallem-promo-poster.png"
              autoPlay
              muted
              loop
              playsInline
              controls
              preload="metadata"
              aria-label="فيديو تعريفي عن منصة Kallem"
            >
              متصفحك لا يدعم تشغيل الفيديو.
            </video>
          </div>
        </div>
      </FormalCard>
    </section>
  );
}

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-white text-wa-gray-900">
      <SmoothScroll />
      <CinematicScrollEffects />

      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(180deg,#F7F9FF_0%,#FFFFFF_28%,#F7F7F8_68%,#FFFFFF_100%)]" />
      <div className="pointer-events-none fixed inset-0 z-0 opacity-70 [background-image:linear-gradient(rgba(26,86,255,.055)_1px,transparent_1px),linear-gradient(90deg,rgba(26,86,255,.055)_1px,transparent_1px)] [background-size:72px_72px]" />

      <header className="sticky top-0 z-50 border-b border-wa-gray-100 bg-white/88 backdrop-blur-2xl">
        <nav className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-3 py-3 sm:px-6 sm:py-4">
          <BrandLockup />
          <div className="hidden items-center gap-1 rounded-full border border-wa-gray-100 bg-wa-gray-50 p-1 lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-4 py-2 text-sm font-medium text-wa-gray-600 transition hover:bg-white hover:text-wa-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wa-blue-600"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden min-h-10 items-center rounded-full px-4 text-sm font-semibold text-wa-gray-600 transition hover:bg-wa-gray-50 hover:text-wa-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wa-blue-600 sm:inline-flex"
            >
              تسجيل الدخول
            </Link>
            <Link
              href="/signup"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-wa-blue-600 px-5 text-sm font-semibold text-white shadow-[0_18px_44px_rgba(26,86,255,0.22)] transition hover:bg-[#0E47E8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wa-blue-600"
            >
              ابدأ مجانًا
            </Link>
          </div>
        </nav>
      </header>

      <section className="relative z-10 mx-auto grid max-w-[1200px] gap-8 px-3 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-16 lg:min-h-[calc(100svh-78px)] lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-10 lg:py-20">
        <div>
          <MotionReveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-wa-blue-100 bg-white px-3 py-2 text-xs font-semibold text-wa-blue-600 shadow-[0_10px_30px_rgba(26,86,255,0.08)]">
              <Sparkles className="size-4" aria-hidden="true" />
              مصمم للأعمال الصغيرة في مصر والعالم العربي
            </div>
            <h1 className="mt-5 max-w-[13ch] text-[40px] font-semibold leading-[1.06] text-wa-gray-900 sm:text-[66px] sm:leading-[1.03] lg:text-[78px]">
              كل محادثات عملائك تتحول لعمل واضح.
            </h1>
            <p className="mt-5 max-w-[680px] text-body leading-7 text-wa-gray-600 sm:mt-7 sm:text-xl sm:leading-8">
              {BRAND_NAME_AR} | {BRAND_NAME} منصة رسائل سوشيال ترد على العملاء في واتساب وإنستجرام وماسنجر، تفهم الرسائل، تسجل الطلبات، تكتشف العملاء المحتملين، وترسل روابط الدفع من لوحة عربية بسيطة.
            </p>
            <div className="mt-6 grid gap-2.5 sm:mt-8 sm:flex sm:flex-wrap sm:gap-3">
              <MagneticLink href="/signup" className="w-full bg-wa-blue-600 text-white shadow-[0_18px_44px_rgba(26,86,255,0.22)] hover:bg-[#0E47E8] sm:w-auto">
                ابدأ مجانًا
                <ArrowLeft className="size-4" aria-hidden="true" />
              </MagneticLink>
              <MagneticLink href="#workflow" className="w-full border border-wa-gray-200 bg-white text-wa-gray-900 hover:bg-wa-gray-50 sm:w-auto">
                شاهد طريقة العمل
              </MagneticLink>
            </div>
            <div className="mt-5 max-w-[420px] rounded-[22px] border border-wa-gray-100 bg-white/92 p-3 shadow-[0_16px_44px_rgba(13,20,33,0.06)] sm:mt-6 sm:p-4">
              <p className="mb-3 text-center text-body-sm font-semibold text-wa-gray-700">أو ادخل مباشرة بحسابك</p>
              <SocialAuthButtons mode="signup" nextPath="/connect" />
            </div>
          </MotionReveal>

          <div className="mt-7 grid grid-cols-2 gap-2.5 sm:mt-9 sm:grid-cols-4 sm:gap-3">
            {heroStats.map((item, index) => (
              <MotionReveal key={item.label} delay={0.08 + index * 0.04}>
                <div className="rounded-2xl border border-wa-gray-100 bg-white px-3 py-3 shadow-[0_12px_34px_rgba(13,20,33,0.05)] sm:px-4 sm:py-4">
                  <p className="text-xs font-medium text-wa-gray-400">{item.label}</p>
                  <p className="mt-2 text-base font-semibold text-wa-gray-900">{item.value}</p>
                </div>
              </MotionReveal>
            ))}
          </div>
        </div>

        <ProductPreview />
      </section>

      <PromoVideoSection />

      <section className="relative z-10 mx-auto max-w-[1200px] px-3 pb-12 sm:px-6 sm:pb-16">
        <FormalCard className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold text-wa-blue-600">مهم للمستخدمين</p>
            <p className="mt-2 text-body-sm leading-6 text-wa-gray-700 sm:text-base sm:leading-7">
              kallem لا يجعل عميلك يتعلم أي شيء جديد. العميل يرسل من واتساب أو إنستجرام أو ماسنجر، وصاحب النشاط يدير الردود، الطلبات، الدفع، والتحليلات من داخل التطبيق.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
            {connectDetails.map((item) => (
              <div key={item} className="flex items-start gap-2 rounded-2xl border border-wa-gray-100 bg-wa-gray-50 px-3 py-2.5">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-wa-blue-600" aria-hidden="true" />
                <span className="text-xs leading-5 text-wa-gray-600">{item}</span>
              </div>
            ))}
          </div>
        </FormalCard>
      </section>

      <section id="workflow" className="relative z-10 mx-auto max-w-[1200px] px-3 py-14 sm:px-6 sm:py-20" data-cinema-section>
        <SectionHeading
          eyebrow="طريقة العمل"
          title="من أول رسالة سوشيال إلى طلب أو عميل محتمل."
          body="التجربة مصممة لصاحب نشاط غير تقني: اربط القنوات، أضف معلوماتك، ثم اترك المساعد يرد تحت تحكمك."
        />
        <div className="mt-8 grid gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-4">
          {workflowSteps.map((step, index) => {
            const Icon = step.icon;

            return (
              <FormalCard key={step.title} className="p-4 sm:p-5" data-cinema-reveal>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-wa-blue-50 text-wa-blue-600">
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                  <span className="text-sm font-semibold text-wa-gray-300">{String(index + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="mt-5 text-xl font-semibold text-wa-gray-900">{step.title}</h3>
                <p className="mt-3 text-body-sm leading-6 text-wa-gray-600">{step.body}</p>
              </FormalCard>
            );
          })}
        </div>
      </section>

      <section id="features" className="relative z-10 border-y border-wa-gray-100 bg-wa-gray-50/80 py-14 sm:py-20" data-cinema-section>
        <div className="mx-auto max-w-[1200px] px-3 sm:px-6">
          <SectionHeading
            eyebrow="مميزات المنتج"
            title="الصفحة الآن تشرح كل قيمة kallem بعد المراحل الجديدة."
            body="بدل ما المنتج يظهر كأنه أداة ردود فقط، الهوم يوضح أنه نظام تشغيل لخدمة العملاء: محادثات، معرفة، طلبات، دفع، قوالب، تحليلات ودعم."
          />
          <div className="mt-8 grid gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-4">
            {featureGroups.map((feature) => (
              <FeatureCard key={feature.title} feature={feature} />
            ))}
          </div>
        </div>
      </section>

      <section id="connect" className="relative z-10 mx-auto max-w-[1200px] px-3 py-14 sm:px-6 sm:py-20" data-cinema-section>
        <div className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr] lg:items-start">
          <SectionHeading
            eyebrow="ربط قنوات Meta بدون قلق"
            title="واتساب وإنستجرام وماسنجر في مسار واحد واضح."
            body="كل قناة لها صلاحيات وقواعد من Meta. لذلك kallem يعرض حالة واتساب، إنستجرام، وماسنجر بوضوح: المتصل، الناقص صلاحيات، وما يحتاج مراجعة قبل استقبال العملاء الحقيقيين."
          />
          <FormalCard className="overflow-hidden" data-cinema-reveal>
            <div className="border-b border-wa-gray-100 p-4 sm:p-6">
              <p className="text-sm font-semibold text-wa-blue-600">ما سيراه صاحب النشاط</p>
              <h3 className="mt-2 text-2xl font-semibold text-wa-gray-900">لوحة ربط القنوات ومتابعة الجاهزية</h3>
            </div>
            <div className="grid gap-3 p-4 sm:p-6">
              {[
                { title: "قنوات Meta", value: "واتساب جاهز، والسوشيال قابل للإضافة", icon: ShieldCheck },
                { title: "إنستجرام وماسنجر", value: "ربط Meta وصلاحيات واضحة", icon: MessageSquareText },
                { title: "الردود الذكية", value: "تعمل حسب قواعد كل قناة", icon: Zap },
                { title: "المالك", value: "يقدر يوقف أو يتدخل يدويًا", icon: SlidersHorizontal },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.title} className="flex items-center gap-3 rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-4">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-wa-blue-600">
                      <Icon className="size-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-wa-gray-900">{item.title}</p>
                      <p className="mt-1 text-body-sm text-wa-gray-600">{item.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </FormalCard>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-[1200px] px-3 py-14 sm:px-6 sm:py-20" data-cinema-section>
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <FormalCard className="p-4 sm:p-6" data-cinema-reveal>
            <div className="flex items-center justify-between gap-3 border-b border-wa-gray-100 pb-4">
              <div>
                <p className="text-sm text-wa-gray-400">مناسب للموبايل</p>
                <h2 className="mt-1 text-2xl font-semibold text-wa-gray-900">أزرار كبيرة ومسار قصير</h2>
              </div>
              <span className="rounded-full bg-wa-blue-50 px-3 py-1.5 text-xs font-semibold text-wa-blue-600">390px ready</span>
            </div>
            <div className="mt-5 space-y-3">
              {[
                "CTA واضح: ابدأ مجانًا أو شاهد طريقة العمل.",
                "النص العربي قصير، داكن، ومباشر على خلفية بيضاء.",
                "كل كارت يشرح نتيجة عملية وليس مصطلح تقني فقط.",
                "روابط المميزات تفتح صفحات التطبيق الفعلية بعد تسجيل الدخول.",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-4">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-wa-blue-600" aria-hidden="true" />
                  <p className="text-body-sm leading-6 text-wa-gray-700">{item}</p>
                </div>
              ))}
            </div>
          </FormalCard>

          <div className="rounded-[32px] border border-wa-gray-100 bg-wa-gray-900 p-3 shadow-[0_22px_70px_rgba(13,20,33,0.16)]" data-cinema-reveal>
            <div className="rounded-[24px] bg-white p-4">
              <div className="flex items-center justify-between">
                <BrandLockup />
                <span className="flex size-10 items-center justify-center rounded-full bg-wa-gray-50 text-sm font-semibold text-wa-gray-600">LO</span>
              </div>
              <div className="mt-6 rounded-[22px] border border-wa-gray-100 bg-wa-gray-50 p-4">
                <p className="text-xs font-semibold text-wa-gray-400">اليوم</p>
                <h3 className="mt-2 text-2xl font-semibold text-wa-gray-900">المساعد يرد على العملاء</h3>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <span className="rounded-2xl bg-white px-3 py-3 text-sm font-semibold text-wa-gray-700">قنوات متصلة</span>
                  <span className="rounded-2xl bg-white px-3 py-3 text-sm font-semibold text-wa-gray-700">Lead جديد</span>
                  <span className="rounded-2xl bg-white px-3 py-3 text-sm font-semibold text-wa-gray-700">طلب جديد</span>
                  <span className="rounded-2xl bg-white px-3 py-3 text-sm font-semibold text-wa-gray-700">دفع جاهز</span>
                </div>
              </div>
              <Link
                href="/dashboard"
                prefetch={false}
                className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-wa-blue-600 px-5 text-sm font-semibold text-white"
              >
                افتح لوحة التحكم
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="relative z-10 border-y border-wa-gray-100 bg-white py-14 sm:py-20" data-cinema-section>
        <div className="mx-auto max-w-[1200px] px-3 sm:px-6">
          <SectionHeading
            eyebrow="الأسعار"
            title="خطط واضحة بالجنيه المصري."
            body="كل خطة تعرض عدد الردود، عدد القنوات، ومتى تحتاج الترقية. بدون وعود غامضة أو كلمة Unlimited."
          />
          <div className="mt-8 grid gap-4 sm:mt-12 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <FormalCard
                key={plan.name}
                className={cn("relative flex flex-col p-4 sm:min-h-[540px] sm:p-6", plan.featured && "border-wa-blue-600 ring-4 ring-wa-blue-50")}
                data-cinema-reveal
              >
                {plan.featured ? (
                  <span className="absolute left-4 top-4 rounded-full bg-wa-blue-600 px-3 py-1 text-xs font-semibold text-white">
                    الأنسب للنمو
                  </span>
                ) : null}
                <p className="text-sm font-semibold text-wa-blue-600">{plan.name}</p>
                <div className="mt-5 flex items-end gap-2">
                  <p className="text-[42px] font-semibold leading-none text-wa-gray-900 sm:text-[54px]">{plan.price}</p>
                  <p className="pb-2 text-sm text-wa-gray-500">/ شهر</p>
                </div>
                <p className="mt-3 text-body-sm leading-6 text-wa-gray-600">{plan.description}</p>
                <div className="mt-5 grid grid-cols-2 gap-2.5">
                  <div className="rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-3">
                    <p className="text-xs text-wa-gray-400">الردود</p>
                    <p className="mt-2 text-sm font-semibold text-wa-gray-900">{plan.replies}</p>
                  </div>
                  <div className="rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-3">
                    <p className="text-xs text-wa-gray-400">القنوات</p>
                    <p className="mt-2 text-sm font-semibold text-wa-gray-900">{plan.numbers}</p>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {plan.features.map((feature) => (
                    <p key={feature} className="flex items-start gap-2 text-sm leading-6 text-wa-gray-600">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-wa-blue-600" aria-hidden="true" />
                      {feature}
                    </p>
                  ))}
                </div>
                <Link
                  href={plan.href}
                  className={cn(
                    "mt-6 inline-flex min-h-12 items-center justify-center rounded-full px-5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wa-blue-600 sm:mt-auto",
                    plan.featured ? "bg-wa-blue-600 text-white hover:bg-[#0E47E8]" : "border border-wa-gray-200 bg-white text-wa-gray-900 hover:bg-wa-gray-50",
                  )}
                >
                  {plan.cta}
                </Link>
              </FormalCard>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-[1200px] px-3 py-14 sm:px-6 sm:py-20">
        <FormalCard className="overflow-hidden p-5 sm:p-10 lg:p-12">
          <div className="grid gap-6 lg:grid-cols-[1fr_0.72fr] lg:items-end">
            <div>
              <p className="text-sm font-semibold text-wa-blue-600">ابدأ الآن</p>
              <h2 className="mt-3 max-w-[760px] text-[32px] font-semibold leading-tight text-wa-gray-900 sm:text-[58px] sm:leading-[1.08]">
                اجعل رسائل السوشيال قناة بيع ودعم، وليس صناديق متفرقة.
              </h2>
              <p className="mt-4 max-w-[640px] text-body-sm leading-6 text-wa-gray-600 sm:text-lg sm:leading-8">
                أنشئ الحساب، أضف معلومات نشاطك، ثم راقب الردود، العملاء المحتملين، الطلبات، والدفع من مكان واحد.
              </p>
            </div>
            <div className="grid gap-3 sm:flex lg:grid lg:flex-none">
              <MagneticLink href="/signup" className="w-full bg-wa-blue-600 text-white shadow-[0_18px_44px_rgba(26,86,255,0.22)] hover:bg-[#0E47E8]">
                إنشاء حساب
                <ArrowLeft className="size-4" aria-hidden="true" />
              </MagneticLink>
              <MagneticLink href="/support" className="w-full border border-wa-gray-200 bg-white text-wa-gray-900 hover:bg-wa-gray-50">
                التواصل مع الدعم
              </MagneticLink>
            </div>
          </div>
        </FormalCard>
      </section>

      <div className="relative z-10">
        <AppFooter />
      </div>
    </main>
  );
}
