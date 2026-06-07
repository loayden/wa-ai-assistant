import type { MessagingChannel } from "@/lib/channels/types";

export type OutboundFailureCode =
  | "meta_test_recipient_blocked"
  | "permission_missing"
  | "token_invalid"
  | "rate_limited"
  | "recipient_unreachable"
  | "session_window_closed"
  | "provider_unavailable"
  | "network_error"
  | "unknown";

export type OutboundRetryPolicy = {
  canRetry: boolean;
  reason: "transient" | "requires_setup" | "requires_customer_action" | "requires_human" | "unknown";
};

export type OutboundFailureClassification = {
  code: OutboundFailureCode;
  title: string;
  userMessage: string;
  fixHint: string;
  actionLabel: string;
  actionHref: string;
  retry: OutboundRetryPolicy;
  providerStatus?: number;
  providerCode?: number;
  providerSubcode?: number;
  providerMessage?: string;
};

export type OutboundAttemptMetadata = {
  version: "outbound-attempt-v1";
  channel: MessagingChannel;
  direction: "manual" | "auto" | "system";
  stage: "pending" | "sending" | "sent" | "failed" | "retrying" | "blocked";
  attemptedAt: string;
  providerMessageId?: string | null;
  failure?: OutboundFailureClassification;
};

type ProviderErrorShape = {
  status?: number;
  response?: {
    error?: {
      message?: string;
      code?: number;
      error_subcode?: number;
      error_data?: {
        details?: string;
      };
    };
  };
};

function extractProviderError(error: unknown): ProviderErrorShape {
  if (!error || typeof error !== "object") {
    return {};
  }

  const candidate = error as ProviderErrorShape;
  return {
    status: typeof candidate.status === "number" ? candidate.status : undefined,
    response: candidate.response,
  };
}

function providerMessage(error: unknown, shape: ProviderErrorShape) {
  const metaMessage = shape.response?.error?.error_data?.details ?? shape.response?.error?.message;

  if (metaMessage) {
    return metaMessage;
  }

  return error instanceof Error ? error.message : typeof error === "string" ? error : undefined;
}

function channelLabel(channel: MessagingChannel) {
  if (channel === "instagram") return "Instagram";
  if (channel === "messenger") return "Messenger";
  return "WhatsApp";
}

export function classifyOutboundFailure(params: {
  channel: MessagingChannel;
  error?: unknown;
  providerError?: string | null;
}): OutboundFailureClassification {
  const shape = extractProviderError(params.error);
  const code = shape.response?.error?.code;
  const subcode = shape.response?.error?.error_subcode;
  const message = params.providerError ?? providerMessage(params.error, shape);
  const providerStatus = shape.status;
  const providerMessageLower = (message ?? "").toLowerCase();

  const base = {
    providerStatus,
    providerCode: code,
    providerSubcode: subcode,
    providerMessage: message,
  };

  if (code === 131030) {
    return {
      ...base,
      code: "meta_test_recipient_blocked",
      title: "رقم الاختبار لا يمكنه مراسلة هذا العميل",
      userMessage:
        "لم يتم إرسال الرد لأن رقم Meta الاختباري يرسل فقط لأرقام الاختبار المعتمدة. استخدم رقم WhatsApp Business إنتاجي أو أضف العميل كمستلم اختبار.",
      fixHint: "افتح إعداد القنوات وتأكد أن الرقم/الصفحة جاهزة للعملاء الحقيقيين، وليس وضع اختبار فقط.",
      actionLabel: "فتح إعداد القنوات",
      actionHref: "/connect",
      retry: { canRetry: false, reason: "requires_setup" },
    };
  }

  if (code === 190 || providerMessageLower.includes("invalid oauth") || providerMessageLower.includes("access token")) {
    return {
      ...base,
      code: "token_invalid",
      title: "انتهت صلاحية الاتصال",
      userMessage: `لم يتم إرسال الرد لأن اتصال ${channelLabel(params.channel)} يحتاج إعادة ربط.`,
      fixHint: "أعد ربط القناة من صفحة القنوات ثم جرّب الإرسال مرة أخرى.",
      actionLabel: "إعادة ربط القناة",
      actionHref: "/connect",
      retry: { canRetry: false, reason: "requires_setup" },
    };
  }

  if (code === 10 || code === 200 || providerMessageLower.includes("permission")) {
    return {
      ...base,
      code: "permission_missing",
      title: "صلاحيات القناة غير مكتملة",
      userMessage: `لم يتم إرسال الرد لأن صلاحيات ${channelLabel(params.channel)} غير مكتملة أو لم تتم الموافقة عليها بعد.`,
      fixHint: "راجع صلاحيات Meta App Review والـ webhooks ثم حدّث اتصال القناة.",
      actionLabel: "فتح إعداد القنوات",
      actionHref: "/connect",
      retry: { canRetry: false, reason: "requires_setup" },
    };
  }

  if (code === 131026) {
    return {
      ...base,
      code: "recipient_unreachable",
      title: "لا يمكن الوصول للعميل",
      userMessage: "لم يتم إرسال الرد لأن Meta لا يمكنها توصيل الرسالة لهذا العميل حالياً.",
      fixHint: "اطلب من العميل إرسال رسالة جديدة أو تحقق من صحة رقم/حساب العميل.",
      actionLabel: "فتح المحادثات",
      actionHref: "/messages",
      retry: { canRetry: false, reason: "requires_customer_action" },
    };
  }

  if (code === 470 || providerMessageLower.includes("24 hour") || providerMessageLower.includes("outside the allowed window")) {
    return {
      ...base,
      code: "session_window_closed",
      title: "نافذة الرد المجاني انتهت",
      userMessage: "لم يتم إرسال الرد لأن نافذة المحادثة المتاحة انتهت. استخدم قالب رسالة معتمد أو انتظر رسالة جديدة من العميل.",
      fixHint: "استخدم قوالب Meta المعتمدة للحملات أو الردود خارج نافذة المحادثة.",
      actionLabel: "فتح القوالب",
      actionHref: "/templates",
      retry: { canRetry: false, reason: "requires_setup" },
    };
  }

  if (providerStatus === 429 || code === 4 || code === 17 || code === 613 || code === 80007) {
    return {
      ...base,
      code: "rate_limited",
      title: "القناة مزدحمة مؤقتاً",
      userMessage: "لم يتم إرسال الرد لأن Meta حدّت الإرسال مؤقتاً. يمكن إعادة المحاولة بعد قليل.",
      fixHint: "انتظر دقيقة ثم أعد المحاولة. إذا تكرر الأمر، راجع حدود الإرسال في Meta.",
      actionLabel: "إعادة المحاولة لاحقاً",
      actionHref: "/messages",
      retry: { canRetry: true, reason: "transient" },
    };
  }

  if (providerStatus && providerStatus >= 500) {
    return {
      ...base,
      code: "provider_unavailable",
      title: "مزود القناة غير متاح مؤقتاً",
      userMessage: "لم يتم إرسال الرد لأن مزود القناة لم يستجب بشكل صحيح. يمكن إعادة المحاولة بعد قليل.",
      fixHint: "أعد المحاولة بعد دقيقة. إذا استمر الفشل، راجع حالة Meta والقناة المتصلة.",
      actionLabel: "إعادة المحاولة لاحقاً",
      actionHref: "/messages",
      retry: { canRetry: true, reason: "transient" },
    };
  }

  if (providerMessageLower.includes("fetch failed") || providerMessageLower.includes("network") || providerMessageLower.includes("timeout")) {
    return {
      ...base,
      code: "network_error",
      title: "مشكلة اتصال مؤقتة",
      userMessage: "لم يتم إرسال الرد بسبب مشكلة اتصال مؤقتة. يمكن إعادة المحاولة بعد قليل.",
      fixHint: "أعد المحاولة بعد لحظات. إذا تكرر الفشل، راجع الاتصال وسجلات الخادم.",
      actionLabel: "إعادة المحاولة لاحقاً",
      actionHref: "/messages",
      retry: { canRetry: true, reason: "transient" },
    };
  }

  return {
    ...base,
    code: "unknown",
    title: "تعذر إرسال الرد",
    userMessage: `لم يتم إرسال الرد عبر ${channelLabel(params.channel)}. راجع إعداد القناة أو تواصل مع الدعم إذا تكرر الفشل.`,
    fixHint: "تحقق من صلاحيات القناة، حالة الاتصال، وأن الحساب جاهز للعملاء الحقيقيين.",
    actionLabel: "فتح إعداد القنوات",
    actionHref: "/connect",
    retry: { canRetry: false, reason: "unknown" },
  };
}

export function buildOutboundAttemptMetadata(params: {
  channel: MessagingChannel;
  direction: OutboundAttemptMetadata["direction"];
  stage: OutboundAttemptMetadata["stage"];
  providerMessageId?: string | null;
  failure?: OutboundFailureClassification;
}): OutboundAttemptMetadata {
  return {
    version: "outbound-attempt-v1",
    channel: params.channel,
    direction: params.direction,
    stage: params.stage,
    attemptedAt: new Date().toISOString(),
    providerMessageId: params.providerMessageId ?? null,
    ...(params.failure ? { failure: params.failure } : {}),
  };
}
