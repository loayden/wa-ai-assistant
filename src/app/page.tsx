import Link from "next/link";
import Image from "next/image";
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
  Megaphone,
  MessageSquareText,
  Mic2,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  UserPlus,
  Zap,
} from "lucide-react";

import { AppFooter } from "@/components/shared/AppFooter";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import { InstagramIcon, MessengerIcon, WhatsAppIcon } from "@/components/icons/ChannelIcons";
import { CinematicScrollEffects } from "@/components/landing/CinematicScrollEffects";
import { MagneticLink } from "@/components/landing/MagneticLink";
import { MotionReveal } from "@/components/landing/MotionReveal";
import { SmoothScroll } from "@/components/landing/SmoothScroll";
import { BRAND_NAME, BRAND_NAME_AR } from "@/lib/utils/brand";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "القنوات الثلاثة", href: "#connect" },
  { label: "الصندوق الموحد", href: "/features/inbox" },
  { label: "المساعد", href: "/features/ai" },
  { label: "الأسعار", href: "/pricing" },
  { label: "الأمان", href: "/security" },
  { label: "المقارنة", href: "/compare/respondio" },
  { label: "المدونة", href: "/blog" },
];

const heroStats = [
  { label: "القنوات", value: "3" },
  { label: "الصندوق", value: "موحد" },
  { label: "اللغة", value: "عربي" },
  { label: "التحكم", value: "فوري" },
];

const channelPreview = [
  { label: "واتساب", body: "رسائل الرقم التجاري", icon: WhatsAppIcon, className: "bg-[#E9FBF0] text-[#0B8F45]" },
  { label: "إنستجرام", body: "DM وتعليقات العملاء", icon: InstagramIcon, className: "bg-[#FFF0F7] text-[#C13584]" },
  { label: "ماسنجر", body: "رسائل صفحة Facebook", icon: MessengerIcon, className: "bg-[#EEF6FF] text-[#0078FF]" },
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

const lifecycleStages = [
  {
    title: "اجمع الرسائل",
    body: "واتساب، إنستجرام، وماسنجر يدخلون إلى صندوق واحد بدل متابعة كل تطبيق وحده.",
    icon: Inbox,
  },
  {
    title: "افهم العميل",
    body: "kallem يقرأ السؤال مع المنتجات، الأسعار، المعرفة، وسياق المحادثة قبل الرد.",
    icon: Bot,
  },
  {
    title: "رد أو سلّم للبشر",
    body: "الرد يخرج تلقائيًا عند الثقة، أو تنتقل المحادثة لصاحب النشاط عند الحاجة.",
    icon: MessageSquareText,
  },
  {
    title: "حوّلها لنتيجة",
    body: "Lead، طلب، رابط دفع، أو تذكرة دعم واضحة بدل رسالة تضيع في الزحمة.",
    icon: Target,
  },
] as const;

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
    features: ["واتساب + إنستجرام + ماسنجر", "قاعدة معرفة", "Leads وتحليلات", "ساعات عمل وتقييمات"],
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

const pexelsPhotos = {
  supportAgent: {
    src: "https://images.pexels.com/photos/7709195/pexels-photo-7709195.jpeg?auto=compress&cs=tinysrgb&w=1400",
    alt: "فريق دعم عملاء يستخدم سماعة ولابتوب لمتابعة المحادثات",
  },
  supportTeam: {
    src: "https://images.pexels.com/photos/7709227/pexels-photo-7709227.jpeg?auto=compress&cs=tinysrgb&w=1400",
    alt: "فريق خدمة عملاء يدير رسائل العملاء من أجهزة لابتوب",
  },
};

const comparisonRows = [
  {
    area: "التركيز",
    competitors: "منصات واسعة تحتاج إعدادات كثيرة وفرق تشغيل أكبر.",
    kallem: "تجربة عربية مركزة على واتساب وإنستجرام وماسنجر لصاحب نشاط صغير أو متوسط.",
  },
  {
    area: "وضوح القنوات",
    competitors: "قد يعرف المستخدم أن القناة لا تعمل بعد تجربة فاشلة.",
    kallem: "يعرض الجاهزية والويب هوك والصلاحيات قبل تشغيل الردود على العملاء الحقيقيين.",
  },
  {
    area: "جودة الرد",
    competitors: "أتمتة عامة أو chatbot يحتاج بناء طويل.",
    kallem: "يرد من معرفة النشاط والمنتجات والسياسات وسياق المحادثة، مع تسليم للبشر عند انخفاض الثقة.",
  },
  {
    area: "التسعير",
    competitors: "تسعير عالمي قد يكون أعلى أو غير واضح للسوق المحلي.",
    kallem: "خطط واضحة بالجنيه المصري وحدود ردود وقنوات مفهومة قبل التسجيل.",
  },
];

const faqItems = [
  {
    question: "هل kallem للواتساب فقط؟",
    answer: "لا. kallem مصمم لإدارة واتساب وإنستجرام وماسنجر من صندوق واحد، مع توضيح حالة كل قناة قبل تشغيل الردود.",
  },
  {
    question: "هل يرد الذكاء الاصطناعي من نفسه؟",
    answer: "الردود تعتمد على معلومات النشاط والمنتجات والسياسات والأسئلة الشائعة. عند نقص البيانات أو انخفاض الثقة يمكن تسليم المحادثة للبشر.",
  },
  {
    question: "هل العميل يحتاج تحميل تطبيق جديد؟",
    answer: "لا. العميل يرسل من واتساب أو إنستجرام أو ماسنجر كالمعتاد، وصاحب النشاط يدير كل شيء من kallem.",
  },
  {
    question: "متى يكون المنتج جاهزًا للعملاء الحقيقيين؟",
    answer: "عندما تكون القنوات متصلة بصلاحيات Meta الصحيحة، والويب هوك فعال، والدفع والإيميلات ومزود الذكاء مهيأة للإنتاج.",
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
        "glass-panel rounded-[20px] sm:rounded-[28px]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function OperatingSystemSection() {
  return (
    <section className="relative z-10 mx-2 max-w-[1200px] rounded-[28px] border border-white/50 bg-white/70 px-3 py-10 shadow-[0_18px_64px_rgba(4,44,83,0.10)] backdrop-blur-2xl sm:mx-auto sm:rounded-[36px] sm:px-6 sm:py-14" data-cinema-section>
      <div className="grid gap-7 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
        <SectionHeading
          eyebrow="نظام تشغيل المحادثات"
          title="كل صفحة لها هدف واحد: تحويل الرسائل إلى عمل منظم."
          body="بدل عرض مميزات كثيرة في نفس اللحظة، kallem يقسم التجربة إلى أربع مراحل يفهمها صاحب النشاط خلال ثوانٍ."
        />
        <div className="grid gap-3 md:grid-cols-2">
          {lifecycleStages.map((stage, index) => {
            const Icon = stage.icon;

            return (
              <div key={stage.title} className="rounded-[24px] border border-white/70 bg-white/76 p-4 shadow-[0_12px_34px_rgba(4,44,83,0.08)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-wa-blue-600 text-white shadow-[0_14px_34px_rgba(26,86,255,0.22)]">
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                  <span className="text-sm font-semibold text-wa-blue-600">{String(index + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="mt-4 text-xl font-semibold text-wa-gray-900">{stage.title}</h3>
                <p className="mt-2 text-body-sm leading-6 text-wa-gray-600">{stage.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
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
        <div className="relative mb-3 overflow-hidden rounded-[18px] border border-wa-gray-100 sm:rounded-[22px]">
          <Image
            src={pexelsPhotos.supportTeam.src}
            alt={pexelsPhotos.supportTeam.alt}
            width={960}
            height={520}
            priority
            className="h-[210px] w-full object-cover sm:h-[260px]"
            sizes="(max-width: 1024px) 100vw, 520px"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,20,33,0.02),rgba(13,20,33,0.62))]" />
          <div className="absolute inset-x-3 bottom-3 rounded-2xl border border-white/50 bg-white/90 p-3 shadow-[0_18px_48px_rgba(13,20,33,0.14)] backdrop-blur">
            <p className="text-xs font-semibold text-wa-blue-600">ليس واتساب فقط</p>
            <p className="mt-1 text-sm font-semibold leading-6 text-wa-gray-900">
              صندوق واحد يجمع واتساب، إنستجرام، وماسنجر مع حالة الرد والتسليم للبشر.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-b border-wa-gray-100 pb-3">
          <div>
            <p className="text-xs font-semibold text-wa-gray-400">مثال للواجهة</p>
            <h2 className="mt-1 text-xl font-semibold text-wa-gray-900 sm:text-2xl">المساعد يعمل الآن</h2>
          </div>
          <span className="inline-flex min-h-9 items-center rounded-full bg-wa-blue-600 px-3 text-xs font-semibold text-white">
            Replying
          </span>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {channelPreview.map((channel) => {
            const Icon = channel.icon;

            return (
              <div key={channel.label} className="flex items-center gap-2 rounded-2xl border border-wa-gray-100 bg-wa-gray-50 px-3 py-2">
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl bg-white", channel.className)}>
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-wa-gray-900">{channel.label}</span>
                  <span className="block truncate text-[11px] text-wa-gray-500">{channel.body}</span>
                </span>
              </div>
            );
          })}
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
            <p className="text-xs font-semibold text-wa-gray-400">محادثة واردة من أي قناة</p>
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

function CustomerProofSection() {
  return (
    <section className="relative z-10 mx-auto max-w-[1200px] px-3 pb-12 sm:px-6 sm:pb-16">
      <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
        <div className="relative overflow-hidden rounded-[30px] border border-wa-gray-100 bg-wa-gray-900 shadow-[0_24px_74px_rgba(13,20,33,0.16)]" data-cinema-reveal>
          <Image
            src={pexelsPhotos.supportAgent.src}
            alt={pexelsPhotos.supportAgent.alt}
            width={1100}
            height={780}
            className="h-[360px] w-full object-cover sm:h-[460px]"
            sizes="(max-width: 1024px) 100vw, 520px"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,20,33,0.04),rgba(13,20,33,0.72))]" />
          <div className="absolute inset-x-4 bottom-4 rounded-[22px] border border-white/40 bg-white/90 p-4 shadow-[0_20px_56px_rgba(13,20,33,0.16)] backdrop-blur sm:inset-x-5 sm:bottom-5 sm:p-5">
            <p className="text-sm font-semibold text-wa-blue-600">تجربة أصحاب الأنشطة</p>
            <h2 className="mt-2 text-2xl font-semibold leading-tight text-wa-gray-900">
              الردود تصبح منظّمة، لكن التحكم يبقى لصاحب النشاط.
            </h2>
          </div>
        </div>

        <div>
          <SectionHeading
            eyebrow="ثقة وتحويل"
            title="العميل يسأل من القناة التي يعرفها، وkallem يحولها إلى متابعة واضحة."
            body="بدل أن يتنقل صاحب النشاط بين واتساب وإنستجرام وماسنجر، تظهر الرسائل والطلبات والـLeads في مكان واحد، مع سبب واضح إذا لم يخرج الرد."
          />
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { icon: BadgeCheck, title: "جاهزية صريحة", body: "لا نقول متصل إذا كانت القناة غير جاهزة للإنتاج." },
              { icon: Target, title: "مسار أقصر", body: "تسجيل، ربط، تدريب، اختبار، تشغيل." },
              { icon: TrendingUp, title: "بيع ودعم", body: "المحادثة تتحول إلى Lead أو طلب أو رد دعم." },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <FormalCard key={item.title} className="p-4" data-cinema-reveal>
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-wa-blue-50 text-wa-blue-600">
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-wa-gray-900">{item.title}</h3>
                  <p className="mt-2 text-body-sm leading-6 text-wa-gray-600">{item.body}</p>
                </FormalCard>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function ComparisonSection() {
  return (
    <section id="comparison" className="relative z-10 mx-auto max-w-[1200px] px-3 py-14 sm:px-6 sm:py-20" data-cinema-section>
      <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
        <SectionHeading
          eyebrow="مقارنة عملية"
          title="الهدف ليس تقليد المنافسين، بل بناء تجربة أبسط للسوق العربي."
          body="kallem يركز على أول قيمة يحتاجها المستخدم: ربط القنوات الثلاثة، فهم حالة كل قناة، والرد من بيانات النشاط بدون لوحة تشغيل معقدة."
        />
        <div className="overflow-hidden rounded-[24px] border border-wa-gray-100 bg-white shadow-[0_18px_54px_rgba(13,20,33,0.05)]" data-cinema-reveal>
          <div className="grid grid-cols-[0.62fr_1fr_1fr] border-b border-wa-gray-100 bg-wa-gray-50 text-sm font-semibold text-wa-gray-700">
            <div className="p-4">المعيار</div>
            <div className="p-4 text-center">أدوات عامة</div>
            <div className="bg-wa-blue-50 p-4 text-center text-wa-blue-700">kallem</div>
          </div>
          {comparisonRows.map((row) => (
            <div key={row.area} className="grid grid-cols-[0.62fr_1fr_1fr] border-b border-wa-gray-100 last:border-b-0">
              <div className="p-4 text-sm font-semibold text-wa-gray-900">{row.area}</div>
              <div className="p-4 text-body-sm leading-6 text-wa-gray-600">{row.competitors}</div>
              <div className="bg-wa-blue-50/50 p-4 text-body-sm font-medium leading-6 text-wa-gray-800">{row.kallem}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section className="relative z-10 border-y border-wa-gray-100 bg-wa-gray-50/80 py-14 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-3 sm:px-6">
        <SectionHeading
          eyebrow="أسئلة قبل التجربة"
          title="إجابات قصيرة تقلل التردد قبل التسجيل."
          body="هذه الأسئلة تظهر للمستخدمين الذين يقارنون بين أدوات الردود التلقائية ويريدون معرفة هل kallem مناسب لهم الآن."
        />
        <div className="mt-8 grid gap-3 md:grid-cols-2">
          {faqItems.map((item) => (
            <FormalCard key={item.question} className="p-4 sm:p-5">
              <h3 className="text-lg font-semibold text-wa-gray-900">{item.question}</h3>
              <p className="mt-3 text-body-sm leading-6 text-wa-gray-600">{item.answer}</p>
            </FormalCard>
          ))}
        </div>
      </div>
    </section>
  );
}

function StructuredData() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
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
              {["واتساب", "إنستجرام", "ماسنجر", "صندوق موحد", "Leads"].map((item) => (
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
    <main className="app-glass-background relative min-h-screen overflow-x-hidden text-wa-gray-900">
      <SmoothScroll />
      <CinematicScrollEffects />
      <StructuredData />

      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_18%_16%,rgba(255,255,255,0.22),transparent_28%),radial-gradient(circle_at_82%_10%,rgba(255,255,255,0.18),transparent_24%)]" />
      <div className="pointer-events-none fixed inset-0 z-0 opacity-24 [background-image:linear-gradient(rgba(255,255,255,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.16)_1px,transparent_1px)] [background-size:72px_72px]" />

      <header className="sticky top-0 z-50 px-2 py-2 sm:px-4">
        <nav className="glass-surface mx-auto flex max-w-[1200px] items-center justify-between gap-3 rounded-[24px] px-3 py-3 sm:px-5 sm:py-4">
          <BrandLockup />
          <div className="hidden items-center gap-1 rounded-full border border-white/70 bg-white/50 p-1 lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-4 py-2 text-sm font-medium text-wa-gray-600 transition hover:bg-white/82 hover:text-wa-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wa-blue-600"
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

      <section className="glass-surface relative z-10 mx-2 mt-3 grid max-w-[1200px] gap-8 rounded-[28px] px-3 pb-12 pt-10 sm:mx-auto sm:mt-5 sm:rounded-[36px] sm:px-6 sm:pb-16 sm:pt-16 lg:min-h-[calc(100svh-110px)] lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-10 lg:py-12">
        <div>
          <MotionReveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-wa-blue-100 bg-white px-3 py-2 text-xs font-semibold text-wa-blue-600 shadow-[0_10px_30px_rgba(26,86,255,0.08)]">
              <Sparkles className="size-4" aria-hidden="true" />
              مصمم للأعمال الصغيرة في مصر والعالم العربي
            </div>
            <h1 className="mt-5 max-w-[13ch] text-[40px] font-semibold leading-[1.06] text-wa-gray-900 sm:text-[66px] sm:leading-[1.03] lg:text-[78px]">
              كل محادثات عملائك تتحول لعمل واضح.
            </h1>
            <p className="mt-5 max-w-[620px] text-body leading-7 text-wa-gray-600 sm:mt-7 sm:text-xl sm:leading-8">
              صندوق موحد وردود AI عربية لواتساب وإنستجرام وماسنجر. اجمع الرسائل، افهم العميل، ورد أو سلّم للبشر، ثم حوّل المحادثة إلى Lead أو طلب.
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
            <div className="mt-5 max-w-[420px] rounded-[22px] border border-wa-gray-100 bg-white/90 p-3 shadow-[0_16px_44px_rgba(13,20,33,0.06)] sm:mt-6 sm:p-4">
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

      <OperatingSystemSection />
      <PromoVideoSection />
      <CustomerProofSection />

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
            title="كل قنوات العملاء في تجربة واحدة واضحة."
            body="kallem ليس أداة واتساب فقط. هو مركز رسائل يربط واتساب وإنستجرام وماسنجر مع معرفة النشاط، الطلبات، الدفع، التحليلات، وتسليم المحادثات للبشر عند الحاجة."
          />
          <div className="mt-8 grid gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-4">
            {featureGroups.map((feature) => (
              <FeatureCard key={feature.title} feature={feature} />
            ))}
          </div>
        </div>
      </section>

      <ComparisonSection />

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
                { title: "واتساب", value: "رقم النشاط التجاري والـ webhook", icon: ShieldCheck },
                { title: "إنستجرام", value: "DM من حساب Professional مرتبط بالصفحة", icon: MessageSquareText },
                { title: "ماسنجر", value: "رسائل صفحة Facebook بنفس الصندوق", icon: Zap },
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

      <FaqSection />

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
