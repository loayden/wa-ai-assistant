import "server-only";

import { AIReplyError } from "@/lib/openai/client";
import { logger } from "@/lib/utils/logger";

export function getAIErrorMessage(error: AIReplyError): string {
  if (error.code === "OPENAI_TIMEOUT") {
    return "المساعد استغرق وقتاً أطول من المتوقع. جرّب مرة أخرى بعد دقيقة.";
  }

  return "المساعد غير متاح مؤقتاً. جرّب مرة أخرى بعد قليل أو تواصل مع الدعم.";
}

export function logAIError(context: string, error: AIReplyError) {
  logger.warn(context, "AI provider request failed.", {
    code: error.code,
    status: error.status,
    error,
  });
}
