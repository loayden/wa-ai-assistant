// FILE: src/app/api/assistant/test/route.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Assistant tests use the same prompt path as production replies but
 * never send WhatsApp messages or consume monthly reply quota.
 */
import { requireAppUser, UnauthorizedError } from "@/lib/api/auth";
import { InvalidJsonError, readJsonRequestBody } from "@/lib/api/request";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess, jsonValidationError } from "@/lib/api/response";
import { getOrCreateUserSettings } from "@/lib/api/settings";
import { AIReplyError, generateAIReply } from "@/lib/openai/client";
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/utils/logger";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { assistantTestSchema } from "@/lib/validators/knowledge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const rateLimit = checkRateLimit({
      key: `assistant-test:${user.id}`,
      limit: 10,
      windowMs: 60_000,
      context: "api.assistant.test",
    });

    if (!rateLimit.allowed) {
      return jsonError("طلبات كثيرة جداً، انتظر قليلاً.", 429, {
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      });
    }

    const body = await readJsonRequestBody(request);
    const parsed = assistantTestSchema.safeParse(body);

    if (!parsed.success) {
      return jsonValidationError(parsed.error);
    }

    const settings = await getOrCreateUserSettings(user.id);
    const reply = await generateAIReply({
      systemPrompt: settings.systemPrompt,
      userMessage: parsed.data.message,
      settings,
    });

    const [connectedCount, knowledgeCount] = await Promise.all([
      prisma.whatsAppConnection.count({
        where: {
          userId: user.id,
          isActive: true,
          isVerified: true,
        },
      }),
      prisma.knowledgeBaseEntry.count({
        where: { userId: user.id },
      }),
    ]);

    const onboardingCompleted = connectedCount > 0 && knowledgeCount > 0;

    if (onboardingCompleted && !user.onboardingCompleted) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { onboardingCompleted: true },
        });
      } catch (error) {
        if (!/onboarding_completed/i.test(error instanceof Error ? error.message : String(error))) {
          throw error;
        }
      }
    }

    return jsonSuccess({
      ...reply,
      onboardingCompleted,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(error.message, 401);
    }

    if (error instanceof InvalidJsonError) {
      return jsonError(error.message, 400);
    }

    if (error instanceof AIReplyError) {
      if (error.code === "OPENAI_RATE_LIMIT") {
        return jsonError(
          "رصيد OpenAI غير كافٍ أو تم تجاوز حد الاستخدام. أضيفي رصيدًا أو فعّلي Billing في OpenAI ثم جرّبي مرة أخرى.",
          503,
          { code: error.code },
        );
      }

      if (error.code === "OPENAI_TIMEOUT") {
        return jsonError("اتصال OpenAI استغرق وقتًا طويلًا. انتظري دقيقة ثم جرّبي مرة أخرى.", 504, { code: error.code });
      }

      return jsonError("تعذر تشغيل اختبار المساعد من OpenAI الآن. راجعي مفتاح OpenAI والرصيد ثم حاولي مرة أخرى.", 503, {
        code: error.code,
      });
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.assistant.test", error);

    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }

    logger.error("api.assistant.test", "Failed to test assistant reply.", { error });
    return jsonError("فشل اختبار المساعد. حاولي مرة أخرى بعد لحظات.", 500);
  }
}
