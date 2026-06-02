// FILE: src/app/api/whatsapp/diagnostics/route.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Manual WhatsApp onboarding needs an authenticated live check so
 * owners can verify credentials, WABA ownership, and webhook subscription after
 * setup without exposing tokens or relying on Meta Embedded Signup.
 */
import { z } from "zod";

import { requireAppUser, UnauthorizedError } from "@/lib/api/auth";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess, jsonValidationError } from "@/lib/api/response";
import { sanitizeConnection } from "@/lib/api/whatsapp";
import { prisma } from "@/lib/prisma/client";
import { decrypt } from "@/lib/utils/encryption";
import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";
import { EmbeddedSignupError, getBusinessAccountPhoneNumber, getPhoneProfile, subscribeAppToBusinessAccount } from "@/lib/whatsapp/embedded-signup";

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
        "environment",
        "وضع التشغيل",
        appEnv.WHATSAPP_MOCK_MODE ? "warning" : "passed",
        appEnv.WHATSAPP_MOCK_MODE
          ? "وضع الاختبار مفعّل، لذلك لن يتم إرسال رسائل واتساب حقيقية."
          : "وضع الاختبار متوقف. kallem سيستخدم WhatsApp Cloud API الحقيقي.",
      ),
      createCheck("webhook-url", "رابط استقبال الرسائل", "passed", webhookUrl),
    ];

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

    await subscribeAppToBusinessAccount(connection.businessAccountId, accessToken);
    checks.push(
      createCheck(
        "webhook-subscription",
        "اشتراك استقبال الرسائل",
        "passed",
        "قبلت Meta اشتراك التطبيق لهذا الحساب التجاري.",
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
