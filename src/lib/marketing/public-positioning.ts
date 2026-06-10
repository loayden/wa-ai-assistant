// FILE: src/lib/marketing/public-positioning.ts
/*
 * [ROLE: PRODUCT MANAGER + FRONTEND ENGINEER]
 * Decision: Public positioning data is centralized so marketing pages, pricing,
 * and competitor pages use the same plan limits and do not drift from billing.
 */
import type { PaymobMode } from "@/lib/paymob/mode";
import { formatStableNumber } from "@/lib/utils/format";
import { PLAN_LIMITS, type PlanTier } from "@/types/subscription";

export const publicMarketingRoutes = {
  whatsapp: "/features/whatsapp",
  social: "/features/instagram",
  ai: "/features/ai",
  inbox: "/features/inbox",
  pricing: "/pricing",
  security: "/security",
  blog: "/blog",
  compareRespondio: "/compare/respond-io",
  compareWhatchimp: "/compare/whatschimp",
} as const;

export const publicNavItems = [
  { label: "القنوات الثلاثة", href: publicMarketingRoutes.whatsapp },
  { label: "إنستجرام وماسنجر", href: publicMarketingRoutes.social },
  { label: "المساعد", href: publicMarketingRoutes.ai },
  { label: "الصندوق", href: publicMarketingRoutes.inbox },
  { label: "الأسعار", href: publicMarketingRoutes.pricing },
  { label: "الأمان والثقة", href: publicMarketingRoutes.security },
  { label: "المقارنة", href: publicMarketingRoutes.compareRespondio },
  { label: "المدونة", href: publicMarketingRoutes.blog },
];

export type PublicPlanCard = {
  tier: PlanTier;
  title: string;
  priceLabel: string;
  description: string;
  replyLimit: string;
  channelLimit: string;
  bestFor: string;
  ctaLabel: string;
  ctaHref: string;
  recommended?: boolean;
  features: string[];
};

const planOrder: PlanTier[] = ["FREE", "PRO", "BUSINESS"];

const planText: Record<
  PlanTier,
  Pick<PublicPlanCard, "title" | "description" | "bestFor" | "ctaLabel" | "features" | "recommended">
> = {
  FREE: {
    title: "Free",
    description: "لتجربة المنتج بأمان قبل استقبال حجم رسائل كبير.",
    bestFor: "تجربة أول قناة ومراجعة جودة الردود",
    ctaLabel: "ابدأ مجانًا",
    features: ["تجربة الردود الأساسية", "إعداد قناة واحدة من الثلاثة", "لوحة رسائل بسيطة"],
  },
  PRO: {
    title: "Pro",
    description: "للأنشطة التي تستقبل رسائل يومية وتحتاج مساعدًا مدربًا على معلوماتها.",
    bestFor: "معظم الأنشطة الصغيرة والمتوسطة",
    ctaLabel: "ابدأ Pro",
    recommended: true,
    features: ["قاعدة معرفة ومنتجات", "حتى 3 قنوات", "Leads وتحليلات", "ساعات عمل وتسليم للبشر"],
  },
  BUSINESS: {
    title: "Business",
    description: "للفرق والأنشطة التي تحتاج مساحة تشغيل أعلى وحجم ردود أكبر.",
    bestFor: "فرق مبيعات ودعم أكثر نشاطًا",
    ctaLabel: "ابدأ Business",
    features: ["حتى 10 قنوات", "حد ردود أعلى", "قوالب وحملات", "طلبات ودفع ودعم أولوية"],
  },
};

export function getPublicPlanCards(): PublicPlanCard[] {
  return planOrder.map((tier) => {
    const limits = PLAN_LIMITS[tier];
    const copy = planText[tier];

    return {
      tier,
      ...copy,
      priceLabel: limits.monthlyPriceEgp === 0 ? "مجانًا" : `${formatStableNumber(limits.monthlyPriceEgp)} جنيه / شهر`,
      replyLimit: `${formatStableNumber(limits.includedRepliesPerMonth)} رد شهري`,
      channelLimit: `${formatStableNumber(limits.maxConnections)} ${limits.maxConnections === 1 ? "قناة" : "قنوات"}`,
      ctaHref: tier === "FREE" ? "/signup" : "/signup?next=%2Fbilling",
    };
  });
}

export function getPublicPaymentModeCopy(mode: PaymobMode) {
  if (mode === "live") {
    return {
      title: "الدفع الإنتاجي متاح",
      body: "أزرار الترقية تفتح صفحة Paymob الآمنة وتعود إلى kallem بعد تأكيد الدفع.",
      tone: "success" as const,
    };
  }

  if (mode === "test") {
    return {
      title: "الدفع ظاهر للمراجعة لكنه ليس مفتوحًا للعملاء بعد",
      body: "kallem يوقف checkout عندما تكون مفاتيح Paymob في وضع الاختبار حتى لا يدفع عميل حقيقي بالخطأ.",
      tone: "warning" as const,
    };
  }

  return {
    title: "الدفع يحتاج إكمال إعداد Paymob",
    body: "الخطط واضحة الآن، لكن الترقية المدفوعة لن تفتح حتى تضاف مفاتيح Paymob الإنتاجية في Vercel.",
    tone: "warning" as const,
  };
}

export const trustSignals = [
  {
    title: "لا نجاح وهمي",
    body: "القناة لا تظهر جاهزة للعملاء الحقيقيين إلا بعد فحص الاتصال، الصلاحيات، الويب هوك، وحالة الموافقة المطلوبة.",
  },
  {
    title: "أسباب فشل واضحة",
    body: "فشل الرد يعرض سببًا عمليًا بالعربية مثل: انتهاء التوكن، نقص صلاحية، رقم اختبار، أو مشكلة مؤقتة في المزود.",
  },
  {
    title: "دفع آمن خارج التطبيق",
    body: "بيانات البطاقة تبقى داخل Paymob. kallem يستقبل نتيجة الدفع فقط ويفصل test/live قبل فتح checkout.",
  },
  {
    title: "تحكم المالك أولًا",
    body: "صاحب النشاط يستطيع إيقاف الردود، تسليم المحادثة للبشر، ومراجعة الردود قبل الاعتماد الكامل.",
  },
];

export const channelPages = {
  whatsapp: {
    eyebrow: "واتساب + إنستجرام + ماسنجر",
    title: "اربط قنوات عملائك الثلاثة من مركز واحد.",
    body: "ابدأ بالقناة الجاهزة لديك، ثم أضف واتساب وإنستجرام وماسنجر في نفس صندوق الرسائل. kallem يوضح حالة كل قناة قبل تشغيل الردود على العملاء الحقيقيين.",
    asset: "/assets/3dicons/chat-text-dynamic-color.png",
    primaryCta: "ابدأ ربط القنوات",
    primaryHref: "/signup?next=%2Fconnect",
    secondaryCta: "شاهد الصندوق الموحد",
    secondaryHref: publicMarketingRoutes.inbox,
    useCases: [
      "ردود WhatsApp على أسئلة السعر والتوصيل والمواعيد",
      "استقبال Instagram DMs من حساب Professional مرتبط بالصفحة",
      "إدارة Messenger لرسائل صفحة Facebook من نفس الصندوق",
      "تسليم أي محادثة للبشر عند انخفاض الثقة أو وجود مشكلة قناة",
    ],
    readiness: [
      "WhatsApp Business رقم إنتاجي أو اختبار واضح",
      "Messenger Page webhook مشترك وصلاحياته جاهزة",
      "Instagram Professional مربوط بصفحة Facebook",
      "OpenAI والمعرفة والمنتجات جاهزة للردود عبر القنوات",
    ],
  },
  social: {
    eyebrow: "Instagram + Messenger AI",
    title: "ردود إنستجرام وماسنجر بدون إخفاء شروط Meta.",
    body: "kallem يوضح هل الصفحة متصلة، هل Instagram مربوط بالصفحة، وهل الصلاحيات والمراجعة تكفي للعملاء الحقيقيين قبل تشغيل الردود.",
    asset: "/assets/3dicons/chat-text-dynamic-color.png",
    primaryCta: "ابدأ ربط Meta",
    primaryHref: "/signup?next=%2Fconnect",
    secondaryCta: "اقرأ الثقة والأمان",
    secondaryHref: publicMarketingRoutes.security,
    useCases: [
      "ردود DM على أسئلة المنتجات والخدمات",
      "إظهار حالة App Review بدل وعود غامضة",
      "تشخيص نقص الصلاحيات أو عدم ربط Instagram بالصفحة",
      "صندوق موحد لرسائل واتساب وإنستجرام وماسنجر",
    ],
    readiness: [
      "Facebook Page مختارة",
      "Instagram Professional مربوط بالصفحة",
      "Page webhook مشترك",
      "صلاحيات Messenger/Instagram معتمدة عند الإطلاق العام",
    ],
  },
} as const;

export const comparisonPages = {
  respondio: {
    competitorName: "respond.io",
    title: "لماذا kallem أبسط للأعمال العربية الصغيرة من respond.io؟",
    body: "respond.io قوي للفرق الكبيرة والقنوات الكثيرة. kallem يركز على صاحب نشاط عربي يريد ربط واتساب وإنستجرام وماسنجر، يعرف ما ينقصه، ويبدأ الردود بدون لوحة معقدة.",
    rows: [
      { area: "الجمهور", competitor: "فرق Enterprise وعمليات متعددة", kallem: "أنشطة عربية صغيرة ومتوسطة تريد بدء سريع" },
      { area: "اللغة والتجربة", competitor: "English-first وتجربة عالمية عامة", kallem: "Arabic-first وRTL من أول شاشة" },
      { area: "الجاهزية", competitor: "يعتمد غالبًا على إعدادات كثيرة", kallem: "Score واضح يفصل code/config عن manual setup" },
      { area: "فشل الردود", competitor: "قد يحتاج فهم تقني", kallem: "سبب عربي وفعل واضح داخل المحادثة" },
      { area: "التجارة المحلية", competitor: "منصة مراسلة واسعة", kallem: "منتجات، طلبات، Paymob، وسياق نشاط محلي" },
    ],
  },
  whatchimp: {
    competitorName: "WhatChimp",
    title: "لماذا kallem أوضح من WhatChimp للردود والجاهزية؟",
    body: "WhatChimp يركز على WhatsApp automation. kallem يضيف شفافية التشغيل: هل القناة صالحة للتجربة فقط أم للعملاء الحقيقيين، وما السبب إذا توقف الرد.",
    rows: [
      { area: "نطاق القنوات", competitor: "تركيز أكبر على واتساب", kallem: "واتساب، إنستجرام، وماسنجر في صندوق واحد" },
      { area: "الشفافية", competitor: "تجربة تعتمد على الربط والتشغيل", kallem: "جاهزية، موافقات، webhooks، وأسباب فشل ظاهرة" },
      { area: "جودة AI", competitor: "أتمتة عامة", kallem: "ردود من معرفة ومنتجات وساعات عمل ومحادثة العميل" },
      { area: "الدفع", competitor: "قد لا يكون محليًا كافيًا", kallem: "تسعير EGP وPaymob مع فصل test/live" },
      { area: "المستخدم", competitor: "مناسب لمن يعرف إعدادات automation", kallem: "مصمم لمالك نشاط غير تقني" },
    ],
  },
} as const;

export const featurePages = {
  ai: {
    eyebrow: "AI Answer Quality",
    title: "مساعد يرد من بيانات نشاطك، لا من تخمين عام.",
    body: "kallem يجمع معلومات النشاط، المنتجات، الأسعار، المعرفة، التصحيحات، ساعات العمل، وسياساتك قبل صياغة الرد. إذا كانت البيانات ناقصة، يوضح ما ينقص بدل اختراع إجابة.",
    asset: "/assets/3dicons/chat-text-dynamic-color.png",
    primaryCta: "اختبر المساعد",
    primaryHref: "/signup?next=%2Fknowledge%23test",
    secondaryCta: "أضف المنتجات",
    secondaryHref: "/signup?next=%2Fproducts",
    highlights: [
      "مصادر الرد تظهر في وضع الاختبار",
      "ثقة الرد تحدد هل يحتاج تدخل بشري",
      "منع اختراع الأسعار والمنتجات والتوصيل",
      "تصحيحات المالك تدخل في سياق الردود القادمة",
    ],
    workflow: [
      "أضف معلومات النشاط",
      "أضف المنتجات والأسعار",
      "أضف الأسئلة المتكررة",
      "اختبر سؤال حقيقي قبل تشغيل الردود",
    ],
  },
  inbox: {
    eyebrow: "Unified Inbox",
    title: "صندوق واحد يوضح ما حدث لكل رسالة ولماذا فشل الرد إن فشل.",
    body: "الرسائل من واتساب وإنستجرام وماسنجر تظهر في مكان واحد، مع حالة الرد التلقائي، التسليم، التسليم للبشر، وسبب الفشل باللغة العربية.",
    asset: "/assets/3dicons/mobile-dynamic-premium.png",
    primaryCta: "افتح الرسائل",
    primaryHref: "/signup?next=%2Fmessages",
    secondaryCta: "راجع الجاهزية",
    secondaryHref: "/signup?next=%2Freadiness",
    highlights: [
      "Timeline واضح للرسالة والرد ومحاولة الإرسال",
      "أسباب فشل مصنفة بدل request failed",
      "تسليم للبشر عند انخفاض الثقة أو وجود مشكلة قناة",
      "Outbox للرسائل المعلقة والفاشلة والقابلة لإعادة المحاولة",
    ],
    workflow: [
      "استقبل الرسالة من القناة",
      "كوّن سياق الرد من بيانات النشاط",
      "أرسل أو سلّم للبشر حسب الجاهزية والثقة",
      "اعرض السبب والفعل التالي إن لم يتم الإرسال",
    ],
  },
} as const;
