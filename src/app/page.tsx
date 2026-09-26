import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  BookOpen,
  Bot,
  CheckCircle2,
  Clock3,
  CreditCard,
  Inbox,
  MessageCircle,
  MessageSquareText,
  MousePointerClick,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  UserRoundCheck,
  Users,
} from "lucide-react";

import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import { InstagramIcon, MessengerIcon, WhatsAppIcon } from "@/components/icons/ChannelIcons";
import { MotionReveal } from "@/components/landing/MotionReveal";
import { AppFooter } from "@/components/shared/AppFooter";
import { LogoMark } from "@/components/shared/LogoMark";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "المميزات", href: "#features" },
  { label: "طريقة العمل", href: "#workflow" },
  { label: "القنوات", href: "#channels" },
  { label: "الأسعار", href: "#pricing" },
  { label: "الأسئلة", href: "#faq" },
];

const proofItems = [
  { label: "قنوات Meta", value: "واتساب + إنستجرام + ماسنجر" },
  { label: "الواجهة", value: "عربية RTL من البداية" },
  { label: "التحكم", value: "رد تلقائي أو تدخل بشري" },
];

const channels = [
  {
    name: "واتساب",
    detail: "رسائل الرقم التجاري والطلبات السريعة",
    icon: WhatsAppIcon,
    tone: "bg-[#E9FBF0] text-[#0B8F45]",
  },
  {
    name: "إنستجرام",
    detail: "DM وأسئلة المنتجات من الحساب الاحترافي",
    icon: InstagramIcon,
    tone: "bg-[#FFF0F7] text-[#C13584]",
  },
  {
    name: "ماسنجر",
    detail: "رسائل صفحة Facebook في نفس الصندوق",
    icon: MessengerIcon,
    tone: "bg-[#EEF6FF] text-[#0078FF]",
  },
];

const painPoints = [
  "رسائل من ثلاث تطبيقات بدون ترتيب واضح.",
  "نفس الأسئلة تتكرر طول اليوم.",
  "عميل مهتم يضيع قبل ما يتحول لطلب.",
];

const outcomePoints = [
  "صندوق واحد يعرف القناة والعميل والسياق.",
  "ردود مبنية على معرفة النشاط والمنتجات.",
  "Lead أو طلب أو تدخل بشري في اللحظة المناسبة.",
];

const useCases = [
  {
    title: "رد على الأسئلة المتكررة",
    body: "المساعد يجيب من الأسعار، المواعيد، السياسات، ومعلومات النشاط بدل ردود عامة.",
    icon: Bot,
  },
  {
    title: "حوّل المحادثات إلى Leads",
    body: "اكتشف العملاء المهتمين بالسعر أو الحجز أو الشراء، وسجّلهم في لوحة واضحة.",
    icon: UserRoundCheck,
  },
  {
    title: "نظّم الطلبات والدفع",
    body: "سجّل الطلب من المحادثة، تابع حالته، وجهّز رابط الدفع عندما يكون العميل جاهزًا.",
    icon: ShoppingBag,
  },
  {
    title: "سلّم المحادثة للبشر",
    body: "عندما يحتاج العميل قرارًا حساسًا، يوقف kallem الردود التلقائية ويترك التحكم لصاحب النشاط.",
    icon: Users,
  },
];

const workflow = [
  {
    title: "اربط القنوات",
    body: "ابدأ بالقنوات الجاهزة، وتأكد من الصلاحيات والـ webhook قبل استقبال عملاء حقيقيين.",
    icon: ShieldCheck,
  },
  {
    title: "علّم kallem نشاطك",
    body: "أضف وصف النشاط، قاعدة المعرفة، المنتجات، الأسعار، وساعات العمل.",
    icon: BookOpen,
  },
  {
    title: "اختبر الردود",
    body: "راجع إجابات المساعد قبل التشغيل، وعدّل التعليمات حتى تصبح مناسبة لطريقتك.",
    icon: MessageSquareText,
  },
  {
    title: "شغّل بثقة",
    body: "راقب الرسائل، الردود، العملاء المحتملين، الطلبات، والمشاكل من نفس الشاشة.",
    icon: BarChart3,
  },
];

const featureCards = [
  {
    title: "صندوق وارد موحد",
    body: "كل رسالة تظهر مع القناة، العميل، حالة الرد، وحالة التدخل البشري.",
    icon: Inbox,
  },
  {
    title: "ردود AI عربية",
    body: "ردود قصيرة وواضحة مبنية على بيانات نشاطك، وليست نصوصًا عامة.",
    icon: Sparkles,
  },
  {
    title: "جاهزية قبل الإطلاق",
    body: "صفحة readiness توضّح ما يعمل وما يحتاج Meta أو OpenAI أو Paymob.",
    icon: BadgeCheck,
  },
  {
    title: "إشارات بيع",
    body: "kallem يلتقط نية الشراء والسعر والحجز حتى لا تضيع الفرص داخل الدردشة.",
    icon: MousePointerClick,
  },
  {
    title: "ساعات عمل",
    body: "رسالة خارج الدوام وتوقيت محلي واضح حتى لا يرد المساعد عكس نظامك.",
    icon: Clock3,
  },
  {
    title: "دفع واشتراكات",
    body: "مسار Paymob جاهز للكود، مع منع الدفع الحقيقي إذا كانت المفاتيح اختبار.",
    icon: CreditCard,
  },
];

const pricingPlans = [
  {
    name: "Free",
    price: "٠ جنيه",
    description: "تجربة أولى لفهم المنتج وإعداد قناة واحدة.",
    features: ["بداية سريعة", "إعداد قناة واحدة", "اختبار الردود"],
  },
  {
    name: "Pro",
    price: "٩٩٩ جنيه",
    description: "للأنشطة التي تستقبل رسائل يومية وتحتاج تنظيمًا وردودًا أسرع.",
    features: ["٣ قنوات", "قاعدة معرفة", "Leads وتحليلات", "ساعات عمل"],
    featured: true,
  },
  {
    name: "Business",
    price: "٢٬٤٩٩ جنيه",
    description: "لحجم محادثات أكبر، منتجات أكثر، ومتابعة تشغيلية أوسع.",
    features: ["قنوات أكثر", "طلبات ودفع", "قوالب وحملات", "أولوية دعم"],
  },
];

const faqs = [
  {
    question: "هل kallem مخصص للواتساب فقط؟",
    answer: "لا. الصفحة والتجربة مصممة حول واتساب وإنستجرام وماسنجر من نفس صندوق الرسائل.",
  },
  {
    question: "هل أحتاج خبرة تقنية؟",
    answer: "لا. المسار الأساسي هو ربط القناة، إضافة معلومات النشاط، اختبار الرد، ثم التشغيل.",
  },
  {
    question: "هل الردود تخرج دائمًا تلقائيًا؟",
    answer: "يمكن تشغيلها أو إيقافها، ويمكن تسليم محادثة واحدة للبشر عندما تحتاج مراجعة.",
  },
  {
    question: "ما الذي يمنع الإطلاق العام؟",
    answer: "يلزم صلاحيات Meta الإنتاجية، رقم WhatsApp Business حقيقي، رصيد OpenAI، ومفاتيح Paymob live.",
  },
];

function BrandLockup({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex items-center", className)} aria-label="kallem home">
      <LogoMark size="lg" />
    </Link>
  );
}

function Surface({
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
        "border border-white/65 bg-white/82 shadow-[0_20px_70px_rgba(4,44,83,0.10)] backdrop-blur-2xl",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function LandingButton({
  children,
  href,
  variant = "primary",
  className,
}: {
  children: ReactNode;
  href: string;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wa-blue-600 sm:min-h-14 sm:px-7",
        variant === "primary"
          ? "bg-wa-blue-600 text-white shadow-[0_18px_44px_rgba(26,86,255,0.23)] hover:bg-[#0E47E8]"
          : "border border-wa-gray-200 bg-white text-wa-gray-900 hover:bg-wa-gray-50",
        className,
      )}
    >
      {children}
    </Link>
  );
}

function SectionHeading({
  eyebrow,
  title,
  body,
  center = false,
}: {
  eyebrow: string;
  title: string;
  body: string;
  center?: boolean;
}) {
  return (
    <div className={cn("max-w-[760px]", center && "mx-auto text-center")}>
      <p className="text-sm font-semibold text-wa-blue-600">{eyebrow}</p>
      <h2 className="mt-3 text-[30px] font-semibold leading-[1.12] text-wa-gray-900 [text-wrap:balance] sm:text-[48px]">
        {title}
      </h2>
      <p className="mt-4 text-body-sm leading-7 text-wa-gray-600 sm:text-lg sm:leading-8">{body}</p>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 px-2 py-2 sm:px-4">
      <nav className="mx-auto flex max-w-[1180px] items-center justify-between gap-3 rounded-[24px] border border-white/70 bg-white/78 px-3 py-3 shadow-[0_16px_48px_rgba(4,44,83,0.10)] backdrop-blur-2xl sm:px-5">
        <BrandLockup />
        <div className="hidden items-center gap-1 rounded-full border border-wa-gray-100 bg-wa-gray-50/80 p-1 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 text-sm font-semibold text-wa-gray-600 transition hover:bg-white hover:text-wa-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wa-blue-600"
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden min-h-11 items-center rounded-full px-4 text-sm font-semibold text-wa-gray-600 transition hover:bg-wa-gray-50 hover:text-wa-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wa-blue-600 sm:inline-flex"
          >
            تسجيل الدخول
          </Link>
          <LandingButton href="/signup" className="min-h-11 px-4 sm:min-h-11 sm:px-5">
            ابدأ الآن
          </LandingButton>
        </div>
      </nav>
    </header>
  );
}

function UnifiedInboxMockup() {
  return (
    <Surface className="relative mx-auto mt-10 max-w-[1040px] overflow-hidden rounded-[28px] p-2 sm:mt-12 sm:rounded-[34px] sm:p-3 lg:mt-14">
      <div className="rounded-[22px] border border-wa-gray-100 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] sm:rounded-[28px]">
        <div className="flex items-center justify-between gap-3 border-b border-wa-gray-100 px-3 py-3 sm:px-4">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-2xl bg-wa-blue-600 text-white">
              <Inbox className="size-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-wa-gray-900">صندوق الرسائل</p>
              <p className="text-xs text-wa-gray-400">كل القنوات في شاشة واحدة</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <span className="rounded-full bg-wa-success-bg px-3 py-1.5 text-xs font-semibold text-wa-success">
              المساعد نشط
            </span>
            <span className="rounded-full bg-wa-blue-50 px-3 py-1.5 text-xs font-semibold text-wa-blue-600">
              ٣ قنوات
            </span>
          </div>
        </div>

        <div className="grid min-h-[560px] bg-wa-gray-50/70 lg:grid-cols-[76px_300px_1fr_230px]">
          <aside className="hidden border-l border-wa-gray-100 bg-white/80 p-3 lg:block">
            <div className="space-y-3">
              {[Inbox, MessageCircle, Users, BarChart3, ShieldCheck].map((Icon, index) => (
                <span
                  key={index}
                  className={cn(
                    "flex size-12 items-center justify-center rounded-2xl text-wa-gray-500",
                    index === 1 && "bg-wa-blue-50 text-wa-blue-600",
                  )}
                >
                  <Icon className="size-5" aria-hidden="true" />
                </span>
              ))}
            </div>
          </aside>

          <section className="border-l border-wa-gray-100 bg-white p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-wa-gray-900">المحادثات</h3>
              <span className="rounded-full bg-wa-gray-50 px-3 py-1.5 text-xs font-semibold text-wa-gray-500">الأحدث</span>
            </div>
            <div className="space-y-2">
              {[
                { name: "عميل من إنستجرام", text: "هل المعسكر مناسب للمبتدئين؟", active: true, channel: "instagram" },
                { name: "رقم واتساب", text: "عايز أعرف السعر والتوصيل", active: false, channel: "whatsapp" },
                { name: "صفحة Facebook", text: "هل يوجد حجز هذا الأسبوع؟", active: false, channel: "messenger" },
                { name: "Lead جديد", text: "أرسل تفاصيل الاشتراك", active: false, channel: "instagram" },
              ].map((item) => (
                <div
                  key={item.name}
                  className={cn(
                    "rounded-[18px] border p-3 transition",
                    item.active
                      ? "border-wa-blue-100 bg-wa-blue-50 shadow-[0_12px_32px_rgba(26,86,255,0.10)]"
                      : "border-wa-gray-100 bg-white",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <ChannelDot channel={item.channel} />
                    <p className="truncate text-sm font-semibold text-wa-gray-900">{item.name}</p>
                  </div>
                  <p className="mt-2 truncate text-xs leading-5 text-wa-gray-500">{item.text}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="flex min-h-[500px] flex-col bg-white/60">
            <div className="border-b border-wa-gray-100 bg-white/85 px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-wa-blue-600">إنستجرام DM</p>
                  <h3 className="mt-1 text-lg font-semibold text-wa-gray-900">عميل يسأل عن الخدمة</h3>
                </div>
                <span className="rounded-full bg-wa-warning-bg px-3 py-1.5 text-xs font-semibold text-wa-warning">
                  يحتاج رد سريع
                </span>
              </div>
            </div>

            <div className="flex-1 space-y-3 p-4">
              <ChatBubble align="start">تفاصيل المعسكر الصيفي لو سمحت؟</ChatBubble>
              <ChatBubble align="end">
                أهلاً بك. المعسكر مناسب للمبتدئين، ويغطي أساسيات البرمجة بمشاريع عملية ومتابعة من المدربين.
              </ChatBubble>
              <ChatBubble align="start">هل فيه حجز أونلاين؟</ChatBubble>
            </div>

            <div className="border-t border-wa-gray-100 bg-white p-3">
              <div className="rounded-[20px] border border-wa-gray-100 bg-wa-gray-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-wa-gray-500">اكتب ردًا أو استخدم المساعد</p>
                  <button
                    type="button"
                    className="flex size-10 items-center justify-center rounded-full bg-wa-blue-600 text-white"
                    aria-label="إرسال الرد"
                  >
                    <Send className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </section>

          <aside className="hidden border-r border-wa-gray-100 bg-white p-4 xl:block">
            <p className="text-sm font-semibold text-wa-gray-900">إشارات المحادثة</p>
            <div className="mt-3 space-y-3">
              {[
                { label: "نية العميل", value: "حجز / سعر" },
                { label: "الثقة", value: "عالية" },
                { label: "الإجراء التالي", value: "إرسال خطوات الحجز" },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-3">
                  <p className="text-xs text-wa-gray-400">{item.label}</p>
                  <p className="mt-2 text-sm font-semibold text-wa-gray-900">{item.value}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </Surface>
  );
}

function ChannelDot({ channel }: { channel: string }) {
  const config =
    channel === "whatsapp"
      ? { Icon: WhatsAppIcon, className: "bg-[#E9FBF0] text-[#0B8F45]" }
      : channel === "messenger"
        ? { Icon: MessengerIcon, className: "bg-[#EEF6FF] text-[#0078FF]" }
        : { Icon: InstagramIcon, className: "bg-[#FFF0F7] text-[#C13584]" };
  const Icon = config.Icon;

  return (
    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-xl", config.className)}>
      <Icon className="size-4" aria-hidden="true" />
    </span>
  );
}

function ChatBubble({ align, children }: { align: "start" | "end"; children: ReactNode }) {
  return (
    <div
      className={cn(
        "max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-[0_10px_30px_rgba(13,20,33,0.06)]",
        align === "end"
          ? "mr-auto rounded-tl-sm bg-wa-blue-600 text-white"
          : "rounded-tr-sm border border-wa-gray-100 bg-white text-wa-gray-700",
      )}
    >
      {children}
    </div>
  );
}

function Hero() {
  return (
    <section className="relative z-10 mx-auto max-w-[1180px] px-3 pb-12 pt-8 sm:px-5 sm:pb-16 sm:pt-12 lg:pb-20">
      <MotionReveal>
        <div className="mx-auto max-w-[920px] text-center">
          <h1 className="text-[42px] font-semibold leading-[1.03] tracking-[-0.01em] text-white [text-wrap:balance] sm:text-[72px] lg:text-[88px]">
            حوّل رسائل السوشيال إلى مبيعات ودعم تلقائي.
          </h1>
          <p className="mx-auto mt-5 max-w-[720px] text-base leading-7 text-white/82 sm:mt-7 sm:text-xl sm:leading-9">
            kallem يجمع واتساب وإنستجرام وماسنجر في صندوق واحد، ويرد بالذكاء الاصطناعي من بيانات نشاطك مع تحكم كامل لصاحب العمل.
          </p>
          <div className="mx-auto mt-7 grid max-w-[520px] gap-3 sm:flex sm:max-w-none sm:justify-center">
            <LandingButton href="/signup" className="w-full sm:w-auto">
              ابدأ مجانًا
              <ArrowLeft className="size-4" aria-hidden="true" />
            </LandingButton>
            <LandingButton href="#workflow" variant="secondary" className="w-full sm:w-auto">
              شاهد طريقة العمل
            </LandingButton>
          </div>
          <div className="mx-auto mt-5 max-w-[440px] rounded-[22px] border border-white/24 bg-white/88 p-3 shadow-[0_20px_60px_rgba(4,44,83,0.18)] backdrop-blur-xl sm:p-4">
            <p className="mb-3 text-center text-sm font-semibold text-wa-gray-700">أو سجّل بسرعة</p>
            <SocialAuthButtons mode="signup" nextPath="/connect" />
          </div>
        </div>
      </MotionReveal>

      <UnifiedInboxMockup />
    </section>
  );
}

function ProofStrip() {
  return (
    <section className="relative z-10 mx-auto max-w-[1180px] px-3 pb-8 sm:px-5">
      <Surface className="rounded-[26px] p-3 sm:rounded-[32px] sm:p-4">
        <div className="grid gap-3 md:grid-cols-3">
          {proofItems.map((item) => (
            <div key={item.label} className="rounded-[20px] border border-wa-gray-100 bg-white p-4 text-center">
              <p className="text-xs font-semibold text-wa-gray-400">{item.label}</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-wa-gray-900">{item.value}</p>
            </div>
          ))}
        </div>
      </Surface>
    </section>
  );
}

function BeforeAfterSection() {
  return (
    <section className="relative z-10 mx-auto max-w-[1180px] px-3 py-12 sm:px-5 sm:py-16">
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <SectionHeading
          eyebrow="قبل وبعد"
          title="بدل متابعة كل رسالة يدويًا، اجعل النظام يفهم وينظم ويرد."
          body="الهدف من الصفحة الجديدة أن يفهم الزائر خلال ثوانٍ: المشكلة واضحة، النتيجة واضحة، والخطوة التالية واضحة."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Surface className="rounded-[28px] p-5">
            <p className="text-sm font-semibold text-wa-error">قبل kallem</p>
            <div className="mt-4 space-y-3">
              {painPoints.map((point) => (
                <p key={point} className="rounded-2xl border border-wa-gray-100 bg-white px-4 py-3 text-sm leading-6 text-wa-gray-600">
                  {point}
                </p>
              ))}
            </div>
          </Surface>
          <Surface className="rounded-[28px] p-5 ring-4 ring-wa-blue-50">
            <p className="text-sm font-semibold text-wa-blue-600">بعد kallem</p>
            <div className="mt-4 space-y-3">
              {outcomePoints.map((point) => (
                <p key={point} className="flex items-start gap-2 rounded-2xl border border-wa-blue-100 bg-white px-4 py-3 text-sm font-semibold leading-6 text-wa-gray-800">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-wa-blue-600" aria-hidden="true" />
                  {point}
                </p>
              ))}
            </div>
          </Surface>
        </div>
      </div>
    </section>
  );
}

function UseCasesSection() {
  return (
    <section id="features" className="relative z-10 bg-white py-14 sm:py-20">
      <div className="mx-auto max-w-[1180px] px-3 sm:px-5">
        <SectionHeading
          eyebrow="ما الذي يفعله عمليًا؟"
          title="أتمتة مفهومة لصاحب نشاط، وليس لوحة تقنية مزدحمة."
          body="استلهمنا من صفحات SaaS عالية التحويل: كل كارت يشرح نتيجة عملية، وليس مجرد اسم ميزة."
          center
        />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {useCases.map((item) => {
            const Icon = item.icon;

            return (
              <MotionReveal key={item.title}>
                <div className="h-full rounded-[26px] border border-wa-gray-100 bg-wa-gray-50 p-5 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_18px_54px_rgba(13,20,33,0.08)]">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-wa-blue-600 text-white shadow-[0_14px_34px_rgba(26,86,255,0.20)]">
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-wa-gray-900">{item.title}</h3>
                  <p className="mt-3 text-body-sm leading-7 text-wa-gray-600">{item.body}</p>
                </div>
              </MotionReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function WorkflowSection() {
  return (
    <section id="workflow" className="relative z-10 mx-auto max-w-[1180px] px-3 py-14 sm:px-5 sm:py-20">
      <SectionHeading
        eyebrow="طريقة العمل"
        title="أربع خطوات من التسجيل إلى التشغيل."
        body="المسار مصمم ليقلل التفكير: كل خطوة لها فعل واحد واضح، وحالة جاهزية توضح ما ينقص قبل الإطلاق."
      />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {workflow.map((step, index) => {
          const Icon = step.icon;

          return (
            <Surface key={step.title} className="rounded-[26px] p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-white text-wa-blue-600">
                  <Icon className="size-5" aria-hidden="true" />
                </div>
                <span className="text-sm font-semibold text-wa-blue-600">{String(index + 1).padStart(2, "0")}</span>
              </div>
              <h3 className="mt-5 text-xl font-semibold text-wa-gray-900">{step.title}</h3>
              <p className="mt-3 text-body-sm leading-7 text-wa-gray-600">{step.body}</p>
            </Surface>
          );
        })}
      </div>
    </section>
  );
}

function ChannelsSection() {
  return (
    <section id="channels" className="relative z-10 bg-wa-gray-50 py-14 sm:py-20">
      <div className="mx-auto grid max-w-[1180px] gap-8 px-3 sm:px-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <SectionHeading
          eyebrow="القنوات"
          title="الاتجاه الكامل للتجربة: الثلاث قنوات معًا."
          body="الصفحة لا تبيع واتساب فقط. الرسالة الأساسية الآن: kallem هو مركز رسائل لواتساب وإنستجرام وماسنجر بنفس الأهمية."
        />
        <div className="grid gap-3">
          {channels.map((channel) => {
            const Icon = channel.icon;

            return (
              <div key={channel.name} className="flex items-center gap-4 rounded-[24px] border border-wa-gray-100 bg-white p-4 shadow-[0_12px_36px_rgba(13,20,33,0.04)]">
                <span className={cn("flex size-14 shrink-0 items-center justify-center rounded-2xl", channel.tone)}>
                  <Icon className="size-7" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-wa-gray-900">{channel.name}</h3>
                  <p className="mt-1 text-body-sm leading-6 text-wa-gray-600">{channel.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FeatureGridSection() {
  return (
    <section className="relative z-10 mx-auto max-w-[1180px] px-3 py-14 sm:px-5 sm:py-20">
      <SectionHeading
        eyebrow="تفاصيل المنتج"
        title="كل ما يحتاجه صاحب النشاط ليبدأ بدون فوضى."
        body="حافظت الصفحة على العمق، لكنها تعرضه بعد أن يفهم الزائر القيمة الأساسية أولًا."
      />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {featureCards.map((feature) => {
          const Icon = feature.icon;

          return (
            <div key={feature.title} className="rounded-[24px] border border-wa-gray-100 bg-white p-5 shadow-[0_14px_44px_rgba(13,20,33,0.045)]">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-wa-blue-50 text-wa-blue-600">
                <Icon className="size-5" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-wa-gray-900">{feature.title}</h3>
              <p className="mt-2 text-body-sm leading-7 text-wa-gray-600">{feature.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section id="pricing" className="relative z-10 bg-white py-14 sm:py-20">
      <div className="mx-auto max-w-[1180px] px-3 sm:px-5">
        <SectionHeading
          eyebrow="الأسعار"
          title="ابدأ صغيرًا، ثم وسّع عندما تزيد المحادثات."
          body="تسعير واضح بالجنيه المصري، مع إبراز أن التشغيل الحقيقي يحتاج إعدادات الإنتاج للقنوات والدفع والذكاء."
          center
        />
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {pricingPlans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "relative flex flex-col rounded-[28px] border border-wa-gray-100 bg-wa-gray-50 p-5 shadow-[0_16px_50px_rgba(13,20,33,0.05)]",
                plan.featured && "border-wa-blue-600 bg-white ring-4 ring-wa-blue-50",
              )}
            >
              {plan.featured ? (
                <span className="absolute left-5 top-5 rounded-full bg-wa-blue-600 px-3 py-1 text-xs font-semibold text-white">
                  الأنسب
                </span>
              ) : null}
              <h3 className="text-lg font-semibold text-wa-gray-900">{plan.name}</h3>
              <div className="mt-5 flex items-end gap-2">
                <p className="text-[42px] font-semibold leading-none text-wa-gray-900">{plan.price}</p>
                <p className="pb-1 text-sm text-wa-gray-500">/ شهر</p>
              </div>
              <p className="mt-4 text-body-sm leading-7 text-wa-gray-600">{plan.description}</p>
              <div className="mt-5 space-y-3">
                {plan.features.map((feature) => (
                  <p key={feature} className="flex items-start gap-2 text-sm leading-6 text-wa-gray-700">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-wa-blue-600" aria-hidden="true" />
                    {feature}
                  </p>
                ))}
              </div>
              <LandingButton href="/signup" variant={plan.featured ? "primary" : "secondary"} className="mt-7 w-full sm:mt-auto">
                اختر الخطة
              </LandingButton>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section id="faq" className="relative z-10 mx-auto max-w-[980px] px-3 py-14 sm:px-5 sm:py-20">
      <SectionHeading
        eyebrow="أسئلة سريعة"
        title="كل سؤال مهم قبل التسجيل يجب أن تكون إجابته قصيرة."
        body="اختصرت النصوص حتى لا يشعر المستخدم أن الصفحة تحتاج قراءة طويلة قبل اتخاذ القرار."
        center
      />
      <div className="mt-8 space-y-3">
        {faqs.map((item) => (
          <details key={item.question} className="group rounded-[22px] border border-white/65 bg-white/84 p-5 shadow-[0_12px_36px_rgba(4,44,83,0.08)] backdrop-blur-xl">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-wa-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wa-blue-600">
              {item.question}
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-wa-blue-50 text-wa-blue-600 transition group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-4 text-body-sm leading-7 text-wa-gray-600">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="relative z-10 mx-auto max-w-[1180px] px-3 py-14 sm:px-5 sm:py-20">
      <Surface className="overflow-hidden rounded-[32px] p-6 sm:p-10 lg:p-12">
        <div className="grid gap-7 lg:grid-cols-[1fr_0.62fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold text-wa-blue-600">ابدأ الآن</p>
            <h2 className="mt-3 max-w-[760px] text-[34px] font-semibold leading-[1.08] text-wa-gray-900 [text-wrap:balance] sm:text-[58px]">
              اجعل كل رسالة فرصة واضحة للرد أو البيع أو المتابعة.
            </h2>
            <p className="mt-4 max-w-[640px] text-body-sm leading-7 text-wa-gray-600 sm:text-lg sm:leading-8">
              أنشئ حسابك، اربط القنوات، أضف معلومات النشاط، ثم شغّل المساعد عندما تصبح الجاهزية مكتملة.
            </p>
          </div>
          <div className="grid gap-3">
            <LandingButton href="/signup" className="w-full">
              إنشاء حساب
              <ArrowLeft className="size-4" aria-hidden="true" />
            </LandingButton>
            <LandingButton href="/pricing" variant="secondary" className="w-full">
              مراجعة الأسعار
            </LandingButton>
          </div>
        </div>
      </Surface>
    </section>
  );
}

function StructuredData() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Kallem",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: "منصة عربية لإدارة رسائل واتساب وإنستجرام وماسنجر والردود الذكية للأعمال الصغيرة والمتوسطة.",
    offers: {
      "@type": "Offer",
      priceCurrency: "EGP",
      price: "999",
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
    </>
  );
}

export default function Home() {
  return (
    <main className="app-glass-background relative min-h-screen overflow-x-hidden text-wa-gray-900">
      <StructuredData />
      <div className="pointer-events-none fixed inset-0 z-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.16)_1px,transparent_1px)] [background-size:72px_72px]" />
      <Header />
      <Hero />
      <ProofStrip />
      <BeforeAfterSection />
      <UseCasesSection />
      <WorkflowSection />
      <ChannelsSection />
      <FeatureGridSection />
      <PricingSection />
      <FaqSection />
      <FinalCta />
      <div className="relative z-10">
        <AppFooter />
      </div>
    </main>
  );
}
