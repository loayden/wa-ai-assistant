// FILE: src/lib/openai/client.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Centralizing AI reply generation keeps prompt interpolation,
 * timeout handling, model selection, and usage logging consistent across API
 * routes and webhook processing.
 */
import "server-only";

import type { UserSettings } from "@prisma/client";
import OpenAI, { APIConnectionTimeoutError, APIError, RateLimitError } from "openai";

import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";

export type GenerateAIReplyParams = {
  systemPrompt: string;
  userMessage: string;
  settings: UserSettings;
};

export type GenerateAIReplyResult = {
  replyText: string;
  modelUsed: string;
  tokensUsed: number;
};

export type AIReplyErrorCode = "OPENAI_RATE_LIMIT" | "OPENAI_TIMEOUT" | "OPENAI_API_ERROR" | "OPENAI_INVALID_RESPONSE";

export class AIReplyError extends Error {
  public readonly code: AIReplyErrorCode;
  public readonly status?: number;
  public readonly originalError?: unknown;

  constructor(code: AIReplyErrorCode, message: string, options?: { status?: number; originalError?: unknown }) {
    super(message);
    this.name = "AIReplyError";
    this.code = code;
    this.status = options?.status;
    this.originalError = options?.originalError;
  }
}

const openai = new OpenAI({
  apiKey: appEnv.OPENAI_API_KEY,
  maxRetries: 2,
  timeout: 30_000,
});

function interpolateSystemPrompt(systemPrompt: string, settings: UserSettings): string {
  const replacements = {
    businessName: settings.businessName?.trim() || "your business",
    language: settings.language,
    maxReplyLength: String(settings.maxReplyLength),
  };

  const interpolatedPrompt = Object.entries(replacements).reduce(
    (prompt, [key, value]) => prompt.replaceAll(`{${key}}`, value),
    systemPrompt,
  );

  if (!settings.businessContext?.trim()) {
    return interpolatedPrompt;
  }

  return `${interpolatedPrompt}\n\nBusiness context:\n${settings.businessContext.trim()}`;
}

function clampReplyLength(replyText: string, maxReplyLength: number): string {
  if (replyText.length <= maxReplyLength) {
    return replyText;
  }

  return replyText.slice(0, maxReplyLength).trim();
}

function resolveMaxTokens(maxReplyLength: number): number {
  return Math.min(500, Math.max(64, Math.ceil(maxReplyLength / 3)));
}

export async function generateAIReply(params: GenerateAIReplyParams): Promise<GenerateAIReplyResult> {
  const prompt = interpolateSystemPrompt(params.systemPrompt, params.settings);

  try {
    const completion = await openai.chat.completions.create({
      model: appEnv.OPENAI_MODEL,
      temperature: 0.2,
      max_tokens: resolveMaxTokens(params.settings.maxReplyLength),
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: params.userMessage },
      ],
    });

    const rawReplyText = completion.choices[0]?.message?.content?.trim();

    if (!rawReplyText) {
      throw new AIReplyError("OPENAI_INVALID_RESPONSE", "OpenAI returned an empty reply.");
    }

    const result = {
      replyText: clampReplyLength(rawReplyText, params.settings.maxReplyLength),
      modelUsed: completion.model,
      tokensUsed: completion.usage?.total_tokens ?? 0,
    };

    logger.info("openai.generateAIReply", "Generated AI reply.", {
      modelUsed: result.modelUsed,
      tokensUsed: result.tokensUsed,
    });

    return result;
  } catch (error) {
    if (error instanceof AIReplyError) {
      logger.error("openai.generateAIReply", "Invalid OpenAI response.", { error });
      throw error;
    }

    if (error instanceof RateLimitError) {
      logger.warn("openai.generateAIReply", "OpenAI rate limit reached.", { error });
      throw new AIReplyError("OPENAI_RATE_LIMIT", "OpenAI rate limit reached.", { status: error.status, originalError: error });
    }

    if (error instanceof APIConnectionTimeoutError) {
      logger.error("openai.generateAIReply", "OpenAI request timed out.", { error });
      throw new AIReplyError("OPENAI_TIMEOUT", "OpenAI request timed out.", { originalError: error });
    }

    if (error instanceof APIError) {
      logger.error("openai.generateAIReply", "OpenAI API request failed.", {
        status: error.status,
        error,
      });
      throw new AIReplyError("OPENAI_API_ERROR", "OpenAI API request failed.", {
        status: error.status,
        originalError: error,
      });
    }

    logger.error("openai.generateAIReply", "Unexpected OpenAI client failure.", { error });
    throw new AIReplyError("OPENAI_API_ERROR", "Unexpected OpenAI client failure.", { originalError: error });
  }
}

export { openai };
