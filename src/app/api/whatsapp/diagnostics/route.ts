// FILE: src/app/api/whatsapp/diagnostics/route.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Manual WhatsApp onboarding needs an authenticated live check so
 * owners can verify credentials, WABA ownership, and webhook subscription after
 * setup without exposing tokens or relying on Meta Embedded Signup.
 */
import { MessageDirection, MessageStatus } from "@prisma/client";
import { z } from "zod";

import { requireAppUser, UnauthorizedError } from "@/lib/api/auth";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess, jsonValidationError } from "@/lib/api/response";
import { getOrCreateUserSettings } from "@/lib/api/settings";
import { sanitizeConnection } from "@/lib/api/whatsapp";
import { isWithinWorkingHours } from "@/lib/assistant/working-hours";
import { prisma } from "@/lib/prisma/client";
import { decrypt } from "@/lib/utils/encryption";
import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";
import { checkSubscriptionLimit } from "@/lib/utils/subscription";
import {
  EmbeddedSignupError,
  getBusinessAccountPhoneNumber,
  getPhoneProfile,
  getSubscribedAppsForBusinessAccount,
} from "@/lib/whatsapp/embedded-signup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const diagnosticsQuerySchema = z
  .object({
    connectionId: z.string().uuid().optional(),
  })
  .strict();

type DiagnosticStatus = "passed" | "warning" | "failed";

type DiagnosticCheck = {
  id: string;
  label: string;
  status: DiagnosticStatus;
  detail: string;
};

function createCheck(id: string, label: string, status: DiagnosticStatus, detail: string): DiagnosticCheck {
  return { id, label, status, detail };
}

function isMetaSandboxPhone(displayPhoneNumber?: string, verifiedName?: string): boolean {
  const digits = displayPhoneNumber?.replace(/\D/g, "") ?? "";

  return /test number/i.test(verifiedName ?? "") || digits === "15551421769";
}

function formatCount(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function truncateDiagnosticText(value: string, maxLength = 180): string {
  const normalized = value.replace(/\s+/g, " ").trim();

  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
}

function formatDiagnosticDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function createAutomaticReplyHistoryCheck(
  latestAttempt:
    | {
        status: MessageStatus;
        aiReplyText: string | null;
        processedAt: Date | null;
        updatedAt: Date;
      }
    | null,
): DiagnosticCheck | null {
  if (!latestAttempt?.aiReplyText) {
    return null;
  }

  const attemptAt = latestAttempt.processedAt ?? latestAttempt.updatedAt;

  if (latestAttempt.status !== MessageStatus.FAILED) {
    return createCheck(
      "last-auto-reply",
      "آخر رد تلقائي",
      "passed",
      `آخر محاولة رد تلقائي اكتملت في ${formatDiagnosticDate(attemptAt)}.`,
    );
  }

  const isOldFailure = Date.now() - attemptAt.getTime() > 7 * 24 * 60 * 60 * 1000;

  return createCheck(
    "recent-auto-reply-failure",
    isOldFailure ? "فشل قديم في الرد التلقائي" : "آخر فشل رد تلقائي",
    isOldFailure ? "warning" : "failed",
    `${truncateDiagnosticText(latestAttempt.aiReplyText)} حدث في ${formatDiagnosticDate(attemptAt)}.`,
  );
}

export async function GET(request: Request) {
  try {
    const user = await requireAppUser();
    const { searchParams } = new URL(request.url);
    const parsed = diagnosticsQuerySchema.safeParse(Object.fromEntries(searchParams));

    if (!parsed.success) {
      return jsonValidationError(parsed.error);
    }

    const connection = await prisma.whatsAppConnection.findFirst({
      where: {
        userId: user.id,
        ...(parsed.data.connectionId ? { id: parsed.data.connectionId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    if (!connection) {
      return jsonSuccess({
        connected: false,
        checks: [
          createCheck("connection", "ربط واتساب", "failed", "لا يوجد رقم واتساب متصل بهذا الحساب حتى الآن."),
        ],
      });
    }

    const webhookUrl = `${appEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/api/webhooks/whatsapp`;
    const [settings, subscriptionLimit, latestAutomaticReplyAttempt] = await Promise.all([
      getOrCreateUserSettings(user.id),
      checkSubscriptionLimit(user.id),
      prisma.message.findFirst({
        where: {
          userId: user.id,
          connectionId: connection.id,
          direction: MessageDirection.INBOUND,
          aiReplyText: { not: null },
        },
        orderBy: [{ processedAt: "desc" }, { updatedAt: "desc" }],
        select: {
          status: true,
          aiReplyText: true,
          processedAt: true,
          updatedAt: true,
        },
      }),
    ]);
    const withinWorkingHours = isWithinWorkingHours(settings);
    const checks: DiagnosticCheck[] = [
      createCheck(
        "connection",
        "الربط المحفوظ",
        connection.isActive && connection.isVerified ? "passed" : "warning",
        connection.isActive && connection.isVerified
          ? "هذا الرقم محفوظ ومفعّل داخل kallem."
          : "هذا الرقم محفوظ، لكنه لم يكتمل تفعيله بعد.",
      ),
      createCheck(
        "auto-reply",
        "تشغيل الرد التلقائي",
        settings.autoReplyEnabled ? "passed" : "failed",
        settings.autoReplyEnabled
          ? "الردود التلقائية مفعلة لهذا الحساب."
          : "الردود التلقائية متوقفة من إعدادات kallem. شغّل زر ردود AI قبل اختبار العملاء.",
      ),
      createCheck(
        "reply-limit",
        "رصيد الردود",
        subscriptionLimit.allowed ? "passed" : "failed",
        subscriptionLimit.allowed
          ? subscriptionLimit.allowsOverage
            ? `الخطة ${subscriptionLimit.planTier.toLowerCase()} تسمح بالردود. المتبقي ضمن الخطة: ${formatCount(subscriptionLimit.remaining)}.`
            : `متبقي ${formatCount(subscriptionLimit.remaining)} من ${formatCount(subscriptionLimit.includedRepliesPerMonth)} رد هذا الشهر.`
          : `انتهى رصيد الردود الشهري في خطة ${subscriptionLimit.planTier.toLowerCase()}. رقّ الخطة أو انتظر بداية الشهر لإعادة التفعيل.`,
      ),
      createCheck(
        "working-hours",
        "ساعات العمل",
        withinWorkingHours ? "passed" : "warning",
        !settings.workingHoursEnabled
          ? "ساعات العمل غير مفعلة، لذلك يمكن للمساعد الرد في أي وقت."
          : withinWorkingHours
            ? "الوقت الحالي داخل ساعات العمل المحددة."
            : "الوقت الحالي خارج ساعات العمل، لذلك سيرسل kallem رسالة خارج الدوام بدل رد AI كامل.",
      ),
      createCheck(
        "environment",
        "وضع التشغيل",
        appEnv.WHATSAPP_MOCK_MODE ? "warning" : "passed",
        appEnv.WHATSAPP_MOCK_MODE
          ? "وضع الاختبار مفعّل، لذلك لن يتم إرسال رسائل واتساب حقيقية."
          : "وضع الاختبار متوقف. kallem سيستخدم WhatsApp Cloud API الحقيقي.",
      ),
      createCheck("webhook-url", "رابط استقبال الرسائل", "passed", webhookUrl),
    ];

    const automaticReplyHistoryCheck = createAutomaticReplyHistoryCheck(latestAutomaticReplyAttempt);

    if (automaticReplyHistoryCheck) {
      checks.push(automaticReplyHistoryCheck);
    }

    if (appEnv.WHATSAPP_MOCK_MODE) {
      return jsonSuccess({
        connected: true,
        mode: "mock",
        connection: sanitizeConnection(connection),
        checks,
      });
    }

    const accessToken = decrypt(connection.accessToken);
    const phoneProfile = await getPhoneProfile(connection.phoneNumberId, accessToken);

    checks.push(
      createCheck(
        "phone-profile",
        "التحقق من رقم الهاتف",
        "passed",
        phoneProfile.display_phone_number
          ? `أرجعت Meta الرقم ${phoneProfile.display_phone_number}${phoneProfile.verified_name ? ` (${phoneProfile.verified_name})` : ""}.`
          : "أكدت Meta صحة معرّف رقم واتساب.",
      ),
    );

    if (isMetaSandboxPhone(phoneProfile.display_phone_number, phoneProfile.verified_name)) {
      checks.push(
        createCheck(
          "customer-replies",
          "الرد على العملاء",
          "warning",
          "هذا رقم Meta التجريبي. يمكنه الرد فقط على الأرقام المضافة كمستلمين تجريبيين في Meta. للرد على عملاء حقيقيين تلقائيًا، اربطي رقم واتساب Business إنتاجي.",
        ),
      );
    }

    const businessPhone = await getBusinessAccountPhoneNumber(connection.businessAccountId, connection.phoneNumberId, accessToken);

    if (!businessPhone) {
      checks.push(
        createCheck(
          "business-account",
          "ملكية حساب واتساب التجاري",
          "failed",
          "لم يتم العثور على معرّف رقم واتساب داخل حساب واتساب التجاري المحفوظ.",
        ),
      );

      return jsonSuccess({
        connected: true,
        mode: "live",
        connection: sanitizeConnection(connection),
        checks,
      });
    }

    checks.push(
      createCheck(
        "business-account",
        "ملكية حساب واتساب التجاري",
        "passed",
        "حساب واتساب التجاري المحفوظ يملك هذا الرقم.",
      ),
    );

    const subscribedApps = await getSubscribedAppsForBusinessAccount(connection.businessAccountId, accessToken);
    const hasWebhookSubscription = subscribedApps.length > 0;

    checks.push(
      createCheck(
        "webhook-subscription",
        "اشتراك استقبال الرسائل",
        hasWebhookSubscription ? "passed" : "failed",
        hasWebhookSubscription
          ? "Meta تؤكد أن هذا الحساب التجاري مشترك في Webhook لاستقبال الرسائل."
          : "لا يوجد اشتراك Webhook نشط لهذا الحساب التجاري داخل Meta. أعيدي الربط أو شغلي الاشتراك من إعدادات Meta.",
      ),
    );

    return jsonSuccess({
      connected: true,
      mode: "live",
      connection: sanitizeConnection(connection),
      checks,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(error.message, 401);
    }

    if (error instanceof EmbeddedSignupError) {
      logger.warn("api.whatsapp.diagnostics", "Meta rejected WhatsApp diagnostics.", {
        status: error.status,
        response: error.response,
      });

      return jsonSuccess({
        connected: true,
        mode: appEnv.WHATSAPP_MOCK_MODE ? "mock" : "live",
        checks: [
          createCheck(
            "meta-api",
            "فحص Meta API",
            "failed",
            "رفضت Meta بيانات الربط المحفوظة. أعيدي ربط الرقم بتوكن جديد يملك صلاحيات إدارة واتساب وإرسال الرسائل.",
          ),
        ],
      });
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.whatsapp.diagnostics", error);

    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }

    logger.error("api.whatsapp.diagnostics", "WhatsApp diagnostics failed.", { error });
    return jsonError("تعذر فحص ربط واتساب.", 500);
  }
}
