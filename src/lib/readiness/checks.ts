import "server-only";

import type { UserSettings } from "@prisma/client";

import { getOrCreateUserSettings } from "@/lib/api/settings";
import { detectPaymobMode } from "@/lib/paymob/mode";
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/utils/logger";
import type {
  LaunchReadinessResponse,
  ReadinessCategory,
  ReadinessCheck,
  ReadinessMode,
  ReadinessStatus,
} from "@/types/api";

type ReadinessOptions = {
  mode?: ReadinessMode;
};

type ConnectionSnapshot = {
  id: string;
  phoneNumberId: string;
  businessAccountId: string;
  ownerPhoneNumber: string | null;
  displayName: string | null;
  channel: string;
  facebookPageId: string | null;
  instagramAccountId: string | null;
  permissions: string[];
  permissionStatus: string;
  webhookSubscribed: boolean;
  isActive: boolean;
  isVerified: boolean;
};

type AIProviderStatus = {
  status: ReadinessStatus;
  message: string;
  technicalDetail?: string;
};

const CHECK_POINTS = {
  whatsapp: 15,
  ai: 20,
  business_info: 10,
  knowledge: 10,
  working_hours: 5,
  production_number: 10,
  webhook: 10,
  products: 10,
  payment: 5,
  templates: 5,
} as const;

const READINESS_CACHE_SECONDS = 45;

function makeCheck(input: {
  id: keyof typeof CHECK_POINTS;
  label: string;
  status: ReadinessStatus;
  message: string;
  category: ReadinessCategory;
  action?: string;
  actionHref?: string;
  technicalDetail?: string;
  isManual?: boolean;
}): ReadinessCheck {
  return {
    ...input,
    points: CHECK_POINTS[input.id],
  };
}

function isConnected(connection: ConnectionSnapshot) {
  return connection.isActive && connection.isVerified;
}

function getPrimaryWhatsApp(connections: ConnectionSnapshot[]) {
  return connections.find((connection) => connection.channel === "whatsapp" && isConnected(connection)) ?? null;
}

function hasReadableText(value: string | null | undefined, minimumLength: number) {
  return Boolean(value && value.trim().length >= minimumLength);
}

function hasProductionNumberSignal(connection: ConnectionSnapshot | null) {
  if (!connection) {
    return false;
  }

  const combined = [connection.displayName, connection.ownerPhoneNumber, connection.phoneNumberId]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!combined.trim()) {
    return false;
  }

  return !/(^|\s)test(\s|$)|test number|meta test|\+1\s*555|1555|sandbox|demo/.test(combined);
}

function calculateSummary(checks: ReadinessCheck[]) {
  const totalPoints = checks.reduce((sum, check) => sum + check.points, 0);
  const earnedPoints = checks.reduce((sum, check) => {
    if (check.status === "pass") {
      return sum + check.points;
    }

    if (check.status === "warn") {
      return sum + Math.floor(check.points * 0.5);
    }

    return sum;
  }, 0);

  const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

  return {
    score,
    passed: checks.filter((check) => check.status === "pass").length,
    warnings: checks.filter((check) => check.status === "warn").length,
    failed: checks.filter((check) => check.status === "fail").length,
    total: checks.length,
  };
}

export function calculateReadinessScore(checks: ReadinessCheck[]): number {
  return calculateSummary(checks).score;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), timeoutMs);

    promise
      .then((value) => resolve(value))
      .catch(() => resolve(fallback))
      .finally(() => clearTimeout(timer));
  });
}

async function pingOpenAI(): Promise<AIProviderStatus> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  if (!apiKey) {
    return {
      status: "fail",
      message: "المساعد غير جاهز لأن مفتاح OpenAI غير مضبوط في الإنتاج.",
      technicalDetail: "OPENAI_API_KEY is missing.",
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6_000);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 5,
        temperature: 0,
      }),
      signal: controller.signal,
    });

    const responseText = await response.text();

    if (response.ok) {
      return {
        status: "pass",
        message: "المساعد الذكي يعمل بشكل طبيعي.",
      };
    }

    if (response.status === 401 || response.status === 403) {
      return {
        status: "fail",
        message: "المساعد غير جاهز بسبب مشكلة في إعداد OpenAI.",
        technicalDetail: `OpenAI returned ${response.status}.`,
      };
    }

    if (response.status === 429 || /quota|billing|insufficient_quota|rate_limit/i.test(responseText)) {
      return {
        status: "fail",
        message: "رصيد OpenAI أو حد الاستخدام يمنع إرسال الردود التلقائية الآن.",
        technicalDetail: "OpenAI quota or rate limit blocked the readiness ping.",
      };
    }

    return {
      status: "warn",
      message: "المساعد لم ينجح في فحص سريع. قد تكون مشكلة مؤقتة.",
      technicalDetail: `OpenAI returned ${response.status}.`,
    };
  } catch (error) {
    logger.warn("readiness.openai", "OpenAI readiness ping failed.", { error });

    return {
      status: "warn",
      message: "تعذر فحص OpenAI الآن. أعد الفحص بعد قليل.",
      technicalDetail: "OpenAI readiness ping timed out or failed.",
    };
  } finally {
    clearTimeout(timer);
  }
}

function getLightAIStatus(): AIProviderStatus {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return {
      status: "fail",
      message: "مفتاح OpenAI غير مضبوط.",
      technicalDetail: "OPENAI_API_KEY is missing.",
    };
  }

  return {
    status: "pass",
    message: "إعداد OpenAI موجود. افتح صفحة الجاهزية للفحص الكامل.",
  };
}

function checkWhatsAppConnected(connections: ConnectionSnapshot[]): ReadinessCheck {
  const whatsapp = getPrimaryWhatsApp(connections);

  if (!whatsapp) {
    return makeCheck({
      id: "whatsapp",
      label: "ربط واتساب",
      status: "fail",
      category: "channels",
      message: "واتساب غير متصل بعد. لن تصل رسائل العملاء إلى kallem.",
      action: "ربط واتساب",
      actionHref: "/connect",
    });
  }

  return makeCheck({
    id: "whatsapp",
    label: "ربط واتساب",
    status: "pass",
    category: "channels",
    message: "واتساب متصل وجاهز لاستقبال رسائل العملاء.",
  });
}

function checkAIAvailable(settings: UserSettings, providerStatus: AIProviderStatus): ReadinessCheck {
  if (!settings.autoReplyEnabled) {
    return makeCheck({
      id: "ai",
      label: "المساعد الذكي",
      status: "warn",
      category: "ai",
      message: "المساعد جاهز لكن الردود التلقائية متوقفة.",
      action: "تشغيل الردود",
      actionHref: "/dashboard",
      technicalDetail: providerStatus.technicalDetail,
    });
  }

  return makeCheck({
    id: "ai",
    label: "المساعد الذكي",
    status: providerStatus.status,
    category: "ai",
    message: providerStatus.message,
    action: providerStatus.status === "pass" ? undefined : "فتح الدعم",
    actionHref: providerStatus.status === "pass" ? undefined : "/support",
    technicalDetail: providerStatus.technicalDetail,
    isManual: providerStatus.status === "fail",
  });
}

function checkBusinessInfoComplete(settings: UserSettings): ReadinessCheck {
  const hasName = hasReadableText(settings.businessName, 2);
  const hasContext = hasReadableText(settings.businessContext, 60);

  if (!hasName && !hasContext) {
    return makeCheck({
      id: "business_info",
      label: "معلومات النشاط",
      status: "warn",
      category: "business",
      message: "أضف اسم النشاط ووصفًا واضحًا حتى تكون الردود شخصية وليست عامة.",
      action: "إضافة معلومات النشاط",
      actionHref: "/dashboard",
    });
  }

  if (!hasContext) {
    return makeCheck({
      id: "business_info",
      label: "معلومات النشاط",
      status: "warn",
      category: "business",
      message: "اسم النشاط موجود، لكن الوصف قصير. أضف الخدمات، الأسعار، وطريقة الطلب.",
      action: "إكمال المعلومات",
      actionHref: "/dashboard",
    });
  }

  return makeCheck({
    id: "business_info",
    label: "معلومات النشاط",
    status: "pass",
    category: "business",
    message: "معلومات النشاط كافية لتوجيه ردود المساعد.",
  });
}

function checkKnowledgeBase(count: number): ReadinessCheck {
  if (count === 0) {
    return makeCheck({
      id: "knowledge",
      label: "قاعدة المعرفة",
      status: "warn",
      category: "business",
      message: "قاعدة المعرفة فارغة. أضف أسئلة العملاء الشائعة وقواعد الرد.",
      action: "إضافة معرفة",
      actionHref: "/knowledge",
    });
  }

  if (count < 3) {
    return makeCheck({
      id: "knowledge",
      label: "قاعدة المعرفة",
      status: "warn",
      category: "business",
      message: `يوجد ${count} مصدر فقط. أضف 3 مصادر على الأقل لردود أدق.`,
      action: "إضافة المزيد",
      actionHref: "/knowledge",
    });
  }

  return makeCheck({
    id: "knowledge",
    label: "قاعدة المعرفة",
    status: "pass",
    category: "business",
    message: `قاعدة المعرفة تحتوي ${count} مصادر.`,
  });
}

function checkWorkingHours(settings: UserSettings): ReadinessCheck {
  if (!settings.workingHoursEnabled) {
    return makeCheck({
      id: "working_hours",
      label: "ساعات العمل",
      status: "warn",
      category: "business",
      message: "ساعات العمل غير محددة. قد يرد المساعد خارج وقتك الحقيقي.",
      action: "ضبط ساعات العمل",
      actionHref: "/settings",
    });
  }

  return makeCheck({
    id: "working_hours",
    label: "ساعات العمل",
    status: "pass",
    category: "business",
    message: `ساعات العمل مضبوطة من ${settings.workingHoursStart} إلى ${settings.workingHoursEnd}.`,
  });
}

function checkProductionNumber(connections: ConnectionSnapshot[]): ReadinessCheck {
  const whatsapp = getPrimaryWhatsApp(connections);

  if (!whatsapp) {
    return makeCheck({
      id: "production_number",
      label: "رقم واتساب حقيقي",
      status: "fail",
      category: "channels",
      message: "لا يوجد رقم واتساب متصل للتحقق من جاهزيته.",
      action: "ربط رقم",
      actionHref: "/connect",
      isManual: true,
    });
  }

  if (!hasProductionNumberSignal(whatsapp)) {
    return makeCheck({
      id: "production_number",
      label: "رقم واتساب حقيقي",
      status: "warn",
      category: "channels",
      message: "يبدو أنك تستخدم رقم Meta تجريبي. العملاء الحقيقيون قد لا يتلقون ردودًا.",
      action: "ربط رقم إنتاج",
      actionHref: "/connect",
      isManual: true,
    });
  }

  return makeCheck({
    id: "production_number",
    label: "رقم واتساب حقيقي",
    status: "pass",
    category: "channels",
    message: "الرقم لا يظهر كرقم اختبار وجاهز للعملاء الحقيقيين.",
  });
}

function checkProducts(count: number): ReadinessCheck {
  if (count === 0) {
    return makeCheck({
      id: "products",
      label: "المنتجات والأسعار",
      status: "warn",
      category: "commerce",
      message: "لم تضف منتجات أو أسعار. المساعد لن يعرف ما تبيعه.",
      action: "إضافة المنتجات",
      actionHref: "/products",
    });
  }

  return makeCheck({
    id: "products",
    label: "المنتجات والأسعار",
    status: "pass",
    category: "commerce",
    message: `${count} منتج متاح للمساعد.`,
  });
}

function checkWebhookAlive(connections: ConnectionSnapshot[]): ReadinessCheck {
  const activeConnections = connections.filter(isConnected);

  if (activeConnections.length === 0) {
    return makeCheck({
      id: "webhook",
      label: "استقبال الرسائل",
      status: "fail",
      category: "channels",
      message: "لا توجد قناة متصلة، لذلك لا يمكن استقبال رسائل العملاء.",
      action: "ربط القنوات",
      actionHref: "/connect",
    });
  }

  const subscribedCount = activeConnections.filter((connection) => connection.webhookSubscribed).length;

  if (subscribedCount === 0) {
    return makeCheck({
      id: "webhook",
      label: "استقبال الرسائل",
      status: "fail",
      category: "channels",
      message: "القنوات متصلة لكن الاشتراك في Webhook غير مؤكد. الرسائل قد لا تصل.",
      action: "إعادة فحص القنوات",
      actionHref: "/connect",
    });
  }

  if (subscribedCount < activeConnections.length) {
    return makeCheck({
      id: "webhook",
      label: "استقبال الرسائل",
      status: "warn",
      category: "channels",
      message: "بعض القنوات جاهزة للاستقبال وبعضها يحتاج إعادة فحص.",
      action: "مراجعة القنوات",
      actionHref: "/connect",
    });
  }

  return makeCheck({
    id: "webhook",
    label: "استقبال الرسائل",
    status: "pass",
    category: "channels",
    message: "Webhooks مفعلة للقنوات المتصلة.",
  });
}

function checkPaymentConfigured(): ReadinessCheck {
  const mode = detectPaymobMode();

  if (mode === "live") {
    return makeCheck({
      id: "payment",
      label: "الدفع والاشتراكات",
      status: "pass",
      category: "payments",
      message: "Paymob مضبوط على وضع الإنتاج.",
    });
  }

  return makeCheck({
    id: "payment",
    label: "الدفع والاشتراكات",
    status: mode === "test" ? "warn" : "fail",
    category: "payments",
    message:
      mode === "test"
        ? "Paymob مضبوط بمفاتيح اختبار. الدفع الحقيقي لن يعمل للعملاء."
        : "إعدادات Paymob الأساسية ناقصة.",
    action: "فتح الفوترة",
    actionHref: "/billing",
    isManual: true,
  });
}

function checkTemplates(approvedCount: number, totalCount: number): ReadinessCheck {
  if (approvedCount > 0) {
    return makeCheck({
      id: "templates",
      label: "قوالب الرسائل",
      status: "pass",
      category: "campaigns",
      message: `${approvedCount} قالب معتمد جاهز للحملات والرسائل المنظمة.`,
    });
  }

  if (totalCount > 0) {
    return makeCheck({
      id: "templates",
      label: "قوالب الرسائل",
      status: "warn",
      category: "campaigns",
      message: "لديك قوالب لكنها لم تُعتمد بعد من Meta.",
      action: "مراجعة القوالب",
      actionHref: "/templates",
      isManual: true,
    });
  }

  return makeCheck({
    id: "templates",
    label: "قوالب الرسائل",
    status: "warn",
    category: "campaigns",
    message: "لا توجد قوالب رسائل. أضف قالبًا قبل إرسال حملات أو رسائل متابعة.",
    action: "إضافة قالب",
    actionHref: "/templates",
  });
}

export async function getLaunchReadiness(
  userId: string,
  options: ReadinessOptions = {},
): Promise<LaunchReadinessResponse> {
  const mode = options.mode ?? "full";
  const aiProviderPromise =
    mode === "full"
      ? withTimeout(
          pingOpenAI(),
          7_000,
          {
            status: "warn",
            message: "تعذر فحص OpenAI الآن. أعد الفحص بعد قليل.",
            technicalDetail: "OpenAI readiness ping timed out.",
          },
        )
      : Promise.resolve(getLightAIStatus());

  const [settings, connections, knowledgeCount, productCount, approvedTemplateCount, totalTemplateCount, aiProviderStatus] =
    await Promise.all([
      getOrCreateUserSettings(userId),
      prisma.whatsAppConnection.findMany({
        where: { userId },
        select: {
          id: true,
          phoneNumberId: true,
          businessAccountId: true,
          ownerPhoneNumber: true,
          displayName: true,
          channel: true,
          facebookPageId: true,
          instagramAccountId: true,
          permissions: true,
          permissionStatus: true,
          webhookSubscribed: true,
          isActive: true,
          isVerified: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.knowledgeBaseEntry.count({ where: { userId } }),
      prisma.product.count({ where: { userId, isAvailable: true } }),
      prisma.messageTemplate.count({
        where: {
          userId,
          status: "approved",
        },
      }),
      prisma.messageTemplate.count({ where: { userId } }),
      aiProviderPromise,
    ]);

  const checks = [
    checkWhatsAppConnected(connections),
    checkAIAvailable(settings, aiProviderStatus),
    checkBusinessInfoComplete(settings),
    checkKnowledgeBase(knowledgeCount),
    checkWorkingHours(settings),
    checkProductionNumber(connections),
    checkWebhookAlive(connections),
    checkProducts(productCount),
    checkPaymentConfigured(),
    checkTemplates(approvedTemplateCount, totalTemplateCount),
  ];
  const summary = calculateSummary(checks);

  return {
    ...summary,
    mode,
    generatedAt: new Date().toISOString(),
    checks,
  };
}

export { READINESS_CACHE_SECONDS };
