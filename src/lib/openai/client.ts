// FILE: src/lib/openai/client.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Centralizing AI reply generation keeps prompt interpolation,
 * timeout handling, model selection, and usage logging consistent across API
 * routes and webhook processing.
 */
import "server-only";

import { randomUUID } from "node:crypto";

import type { UserSettings } from "@prisma/client";
import OpenAI, { APIConnectionTimeoutError, APIError, RateLimitError } from "openai";

import { buildAIContextBundle, type AIContextBundle, type AIContextSource } from "@/lib/ai/context-builder";
import type { MessagingChannel } from "@/lib/channels/types";
import { writeAIReplyTrace } from "@/lib/observability/ai-reply-traces";
import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";

export type GenerateAIReplyParams = {
  systemPrompt: string;
  userMessage: string;
  settings: UserSettings;
  extraInstructions?: string[];
  forceEgyptianArabic?: boolean;
  channel?: MessagingChannel;
  connectionId?: string;
  customerId?: string;
};

export type GenerateAIReplyResult = {
  replyText: string;
  modelUsed: string;
  tokensUsed: number;
  confidence: number;
  sources: AIContextSource[];
  missingData: string[];
  needsHuman: boolean;
  suggestedAction: "reply" | "ask_clarifying_question" | "handoff" | "collect_missing_data";
  outsideWorkingHours: boolean;
  trace: AIReplyTrace;
};

export type AIReplyTrace = {
  id: string;
  contextVersion: "ai-context-v1";
  sourceIds: string[];
  sourceCount: number;
  confidence: number;
  missingData: string[];
  needsHuman: boolean;
  suggestedAction: GenerateAIReplyResult["suggestedAction"];
  outsideWorkingHours: boolean;
  modelUsed: string;
  tokensUsed: number;
  generatedAt: string;
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

function interpolateSystemPrompt(
  systemPrompt: string,
  settings: UserSettings,
  contextBundle: AIContextBundle,
  runtimeSections: {
    extraInstructions?: string[];
    forceEgyptianArabic?: boolean;
    channel?: MessagingChannel;
  },
): string {
  const replacements = {
    businessName: settings.businessName?.trim() || "your business",
    language: settings.language,
    maxReplyLength: String(settings.maxReplyLength),
  };

  const interpolatedPrompt = Object.entries(replacements).reduce(
    (prompt, [key, value]) => prompt.replaceAll(`{${key}}`, value),
    systemPrompt,
  );

  const sections = [interpolatedPrompt];

  sections.push(
    [
      "AI quality contract:",
      "Return only a valid JSON object. Do not wrap it in markdown.",
      'Required JSON shape: {"replyText":"string","confidence":0.0,"sources":["source_id"],"missingData":["string"],"needsHuman":false,"suggestedAction":"reply|ask_clarifying_question|handoff|collect_missing_data","outsideWorkingHours":false}',
      "Use only the available source ids listed below in sources.",
      "Never invent prices, products, availability, delivery times, approvals, offers, or policies.",
      "If a needed detail is missing, say that clearly in replyText, add the missing item to missingData, set confidence <= 0.4, and set needsHuman true unless a simple clarification question is enough.",
      "If the user asks about a product that is not listed, do not quote a price. Ask which listed product they mean or say the team will confirm.",
      "Keep replyText natural, short, customer-facing, and in the user's language unless business settings require otherwise.",
    ].join("\n"),
  );

  sections.push(contextBundle.promptSections.sourceRegistry);

  if (contextBundle.promptSections.businessContext) {
    sections.push(`Business context:\nSource id: business_profile\n${contextBundle.promptSections.businessContext}`);
  }

  if (runtimeSections.forceEgyptianArabic) {
    sections.push("Reply in friendly Egyptian Arabic. Do not use stiff formal Arabic unless the customer does.");
  }

  if (runtimeSections.channel) {
    const channelToneGuide: Record<MessagingChannel, string> = {
      whatsapp: "أسلوب مختصر ومباشر، مناسب للجوال.",
      instagram: "أسلوب اجتماعي وودود، قصير، يناسب جمهور إنستجرام.",
      messenger: "أسلوب محترف وودود، مناسب للتواصل عبر فيسبوك.",
    };

    sections.push(`Channel style note: ${channelToneGuide[runtimeSections.channel]}`);

    if (runtimeSections.channel === "instagram") {
      sections.push(
        [
          "Instagram channel persona:",
          `Tone: ${settings.instagramTone ?? settings.language}`,
          "Style: استخدم أسلوباً اجتماعياً وودياً. يمكن استخدام emoji بشكل طبيعي. اجعل الردود قصيرة ومباشرة.",
          settings.instagramInstructions?.trim() ? `Special instructions: ${settings.instagramInstructions.trim()}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      );
    }

    if (runtimeSections.channel === "messenger") {
      sections.push(
        [
          "Messenger channel persona:",
          `Tone: ${settings.messengerTone ?? settings.language}`,
          "Style: أسلوب احترافي وودود. ابدأ بتحية عند الحاجة. ردود متوسطة الطول وواضحة.",
          settings.messengerInstructions?.trim() ? `Special instructions: ${settings.messengerInstructions.trim()}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      );
    }
  }

  if (contextBundle.promptSections.workingHoursBlock) {
    sections.push(contextBundle.promptSections.workingHoursBlock.trim());
  }

  if (contextBundle.promptSections.knowledgeBlock) {
    sections.push(contextBundle.promptSections.knowledgeBlock.trim());
  }

  if (contextBundle.promptSections.catalogBlock) {
    sections.push(contextBundle.promptSections.catalogBlock.trim());
  }

  if (contextBundle.promptSections.correctionsBlock) {
    sections.push(contextBundle.promptSections.correctionsBlock.trim());
  }

  if (contextBundle.promptSections.customerProfileBlock) {
    sections.push(contextBundle.promptSections.customerProfileBlock.trim());
  }

  if (contextBundle.promptSections.conversationHistoryBlock) {
    sections.push(contextBundle.promptSections.conversationHistoryBlock.trim());
  }

  if (runtimeSections.extraInstructions?.length) {
    sections.push(`Routing instructions for this message:\n${runtimeSections.extraInstructions.map((instruction) => `- ${instruction}`).join("\n")}`);
  }

  return sections.join("\n\n");
}

function clampReplyLength(replyText: string, maxReplyLength: number): string {
  const orderTag = replyText.match(/\[\[ORDER:\s*({[\s\S]*?})\s*\]\]/)?.[0];

  if (orderTag) {
    const visibleReply = replyText.replace(orderTag, "").trim();
    const clampedVisibleReply = visibleReply.length <= maxReplyLength ? visibleReply : visibleReply.slice(0, maxReplyLength).trim();
    return `${clampedVisibleReply}\n\n${orderTag}`.trim();
  }

  if (replyText.length <= maxReplyLength) {
    return replyText;
  }

  return replyText.slice(0, maxReplyLength).trim();
}

function resolveMaxTokens(maxReplyLength: number): number {
  return Math.min(500, Math.max(64, Math.ceil(maxReplyLength / 3)));
}

function clampConfidence(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0.5;
  }

  return Math.max(0, Math.min(1, value));
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasPriceIntent(message: string) {
  const normalized = normalizeText(message);
  return /\b(price|cost|how much|pricing)\b/.test(normalized) || /(بكام|سعر|اسعار|أسعار|تكلفة|كام|كم)/.test(message);
}

function messageMentionsKnownProduct(message: string, contextBundle: AIContextBundle) {
  const normalizedMessage = normalizeText(message);

  return contextBundle.products.some((product) => {
    const names = [product.name, product.nameEn].filter(Boolean).map((name) => normalizeText(String(name)));
    return names.some((name) => name.length >= 2 && normalizedMessage.includes(name));
  });
}

function buildTrace(params: {
  contextBundle: AIContextBundle;
  confidence: number;
  missingData: string[];
  needsHuman: boolean;
  suggestedAction: GenerateAIReplyResult["suggestedAction"];
  modelUsed: string;
  tokensUsed: number;
}): AIReplyTrace {
  return {
    id: randomUUID(),
    contextVersion: "ai-context-v1",
    sourceIds: params.contextBundle.sources.map((source) => source.id),
    sourceCount: params.contextBundle.sources.length,
    confidence: params.confidence,
    missingData: params.missingData,
    needsHuman: params.needsHuman,
    suggestedAction: params.suggestedAction,
    outsideWorkingHours: params.contextBundle.outsideWorkingHours,
    modelUsed: params.modelUsed,
    tokensUsed: params.tokensUsed,
    generatedAt: new Date().toISOString(),
  };
}

function buildGuardedReply(params: {
  replyText: string;
  contextBundle: AIContextBundle;
  confidence: number;
  missingData: string[];
  needsHuman: boolean;
  suggestedAction: GenerateAIReplyResult["suggestedAction"];
  sources?: AIContextSource[];
  modelUsed?: string;
}): GenerateAIReplyResult {
  const confidence = clampConfidence(params.confidence);
  const missingData = Array.from(new Set(params.missingData.filter(Boolean)));
  const needsHuman = params.needsHuman || confidence < 0.5;
  const modelUsed = params.modelUsed ?? "context-guard";
  const tokensUsed = 0;

  return {
    replyText: clampReplyLength(params.replyText, params.contextBundle.maxReplyLength),
    modelUsed,
    tokensUsed,
    confidence,
    sources: params.sources ?? [],
    missingData,
    needsHuman,
    suggestedAction: needsHuman && params.suggestedAction === "reply" ? "handoff" : params.suggestedAction,
    outsideWorkingHours: params.contextBundle.outsideWorkingHours,
    trace: buildTrace({
      contextBundle: params.contextBundle,
      confidence,
      missingData,
      needsHuman,
      suggestedAction: needsHuman && params.suggestedAction === "reply" ? "handoff" : params.suggestedAction,
      modelUsed,
      tokensUsed,
    }),
  };
}

function buildPreflightReply(userMessage: string, contextBundle: AIContextBundle): GenerateAIReplyResult | null {
  if (!contextBundle.hasGroundingContext) {
    return buildGuardedReply({
      replyText: "شكراً لتواصلك. لا أملك تفاصيل كافية عن النشاط حالياً، وسيقوم أحد أفراد الفريق بالرد عليك قريباً.",
      contextBundle,
      confidence: 0.1,
      missingData: ["business_profile", "knowledge_base", "products"],
      needsHuman: true,
      suggestedAction: "collect_missing_data",
    });
  }

  if (hasPriceIntent(userMessage)) {
    if (contextBundle.products.length > 0 && !messageMentionsKnownProduct(userMessage, contextBundle)) {
      return buildGuardedReply({
        replyText: "ممكن توضح تقصد أي منتج بالتحديد؟ سأراجع لك السعر من المنتجات المتاحة فقط.",
        contextBundle,
        confidence: 0.52,
        missingData: ["specific_product"],
        needsHuman: false,
        suggestedAction: "ask_clarifying_question",
        sources: contextBundle.sources.filter((source) => source.type === "product").slice(0, 4),
      });
    }

    const hasProductOrKnowledgePricing = contextBundle.sources.some((source) => source.type === "product" || source.type === "knowledge" || source.type === "business_profile");

    if (!hasProductOrKnowledgePricing) {
      return buildGuardedReply({
        replyText: "لا أملك أسعاراً مؤكدة حالياً. سيؤكد لك الفريق السعر قبل أي طلب.",
        contextBundle,
        confidence: 0.25,
        missingData: ["product_prices"],
        needsHuman: true,
        suggestedAction: "handoff",
      });
    }
  }

  return null;
}

type RawStructuredReply = {
  replyText?: unknown;
  reply_text?: unknown;
  confidence?: unknown;
  sources?: unknown;
  missingData?: unknown;
  missing_data?: unknown;
  needsHuman?: unknown;
  needs_human?: unknown;
  suggestedAction?: unknown;
  suggested_action?: unknown;
  outsideWorkingHours?: unknown;
  outside_working_hours?: unknown;
};

function parseJsonObject(raw: string): RawStructuredReply | null {
  const trimmed = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();

  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as RawStructuredReply) : null;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");

    if (start === -1 || end <= start) {
      return null;
    }

    try {
      const parsed = JSON.parse(trimmed.slice(start, end + 1));
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as RawStructuredReply) : null;
    } catch {
      return null;
    }
  }
}

function normalizeMissingData(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()))).slice(0, 8);
}

function normalizeSuggestedAction(value: unknown): GenerateAIReplyResult["suggestedAction"] {
  if (value === "ask_clarifying_question" || value === "handoff" || value === "collect_missing_data") {
    return value;
  }

  return "reply";
}

function normalizeSources(value: unknown, contextBundle: AIContextBundle) {
  const requestedSources = Array.isArray(value) ? value : [];
  const sourcesById = new Map(contextBundle.sources.map((source) => [source.id, source]));
  const sourcesByTitle = new Map(contextBundle.sources.map((source) => [normalizeText(source.title), source]));
  const matched: AIContextSource[] = [];

  for (const item of requestedSources) {
    const candidate =
      typeof item === "string"
        ? item
        : item && typeof item === "object" && "id" in item && typeof item.id === "string"
          ? item.id
          : item && typeof item === "object" && "title" in item && typeof item.title === "string"
            ? item.title
            : "";
    const source = sourcesById.get(candidate) ?? sourcesByTitle.get(normalizeText(candidate));

    if (source && !matched.some((existing) => existing.id === source.id)) {
      matched.push(source);
    }
  }

  return matched.slice(0, 6);
}

function parseStructuredReply(rawReplyText: string, contextBundle: AIContextBundle, modelUsed: string, tokensUsed: number): GenerateAIReplyResult {
  const parsed = parseJsonObject(rawReplyText);

  if (!parsed) {
    const fallbackConfidence = contextBundle.hasGroundingContext ? 0.55 : 0.25;
    return buildGuardedReply({
      replyText: rawReplyText,
      contextBundle,
      confidence: fallbackConfidence,
      missingData: contextBundle.hasGroundingContext ? ["structured_output"] : ["business_context"],
      needsHuman: fallbackConfidence < 0.5,
      suggestedAction: fallbackConfidence < 0.5 ? "handoff" : "reply",
      modelUsed,
    });
  }

  const replyTextValue = typeof parsed.replyText === "string" ? parsed.replyText : typeof parsed.reply_text === "string" ? parsed.reply_text : "";

  if (!replyTextValue.trim()) {
    throw new AIReplyError("OPENAI_INVALID_RESPONSE", "OpenAI returned a structured reply without replyText.");
  }

  const missingData = normalizeMissingData(parsed.missingData ?? parsed.missing_data);
  let confidence = clampConfidence(parsed.confidence);
  const sources = normalizeSources(parsed.sources, contextBundle);
  let suggestedAction = normalizeSuggestedAction(parsed.suggestedAction ?? parsed.suggested_action);
  let needsHuman = Boolean(parsed.needsHuman ?? parsed.needs_human);

  if (missingData.length > 0) {
    confidence = Math.min(confidence, suggestedAction === "ask_clarifying_question" ? 0.55 : 0.4);
  }

  if (sources.length === 0 && contextBundle.hasGroundingContext && missingData.length === 0) {
    confidence = Math.min(confidence, 0.55);
  }

  if (confidence < 0.5 && suggestedAction === "reply") {
    suggestedAction = "handoff";
  }

  needsHuman = needsHuman || confidence < 0.5 || suggestedAction === "handoff" || suggestedAction === "collect_missing_data";

  return {
    replyText: clampReplyLength(replyTextValue.trim(), contextBundle.maxReplyLength),
    modelUsed,
    tokensUsed,
    confidence,
    sources,
    missingData,
    needsHuman,
    suggestedAction,
    outsideWorkingHours:
      typeof parsed.outsideWorkingHours === "boolean"
        ? parsed.outsideWorkingHours
        : typeof parsed.outside_working_hours === "boolean"
          ? parsed.outside_working_hours
          : contextBundle.outsideWorkingHours,
    trace: buildTrace({
      contextBundle,
      confidence,
      missingData,
      needsHuman,
      suggestedAction,
      modelUsed,
      tokensUsed,
    }),
  };
}

export function buildAIReplyTraceMetadata(reply: GenerateAIReplyResult) {
  return {
    version: reply.trace.contextVersion,
    traceId: reply.trace.id,
    confidence: reply.confidence,
    sources: reply.sources.map((source) => ({
      id: source.id,
      type: source.type,
      title: source.title,
    })),
    missingData: reply.missingData,
    needsHuman: reply.needsHuman,
    suggestedAction: reply.suggestedAction,
    outsideWorkingHours: reply.outsideWorkingHours,
    modelUsed: reply.modelUsed,
    tokensUsed: reply.tokensUsed,
    generatedAt: reply.trace.generatedAt,
  };
}

function mapAIReplyFailureReason(error: unknown): string {
  if (error instanceof AIReplyError) {
    if (error.code === "OPENAI_RATE_LIMIT") {
      return "OPENAI_QUOTA";
    }

    if (error.code === "OPENAI_TIMEOUT") {
      return "OPENAI_TIMEOUT";
    }

    if (error.status === 401 || error.status === 403) {
      return "OPENAI_AUTH";
    }

    return "UNKNOWN";
  }

  if (error instanceof RateLimitError) {
    return "OPENAI_QUOTA";
  }

  if (error instanceof APIConnectionTimeoutError) {
    return "OPENAI_TIMEOUT";
  }

  if (error instanceof APIError && (error.status === 401 || error.status === 403)) {
    return "OPENAI_AUTH";
  }

  return "UNKNOWN";
}

export async function generateAIReply(params: GenerateAIReplyParams): Promise<GenerateAIReplyResult> {
  const startedAt = Date.now();
  const contextBundle = await buildAIContextBundle({
    settings: params.settings,
    userMessage: params.userMessage,
    channel: params.channel,
    connectionId: params.connectionId,
    customerId: params.customerId,
  });
  const preflightReply = buildPreflightReply(params.userMessage, contextBundle);

  if (preflightReply) {
    logger.warn("openai.generateAIReply", "AI reply guarded before provider call.", {
      suggestedAction: preflightReply.suggestedAction,
      missingData: preflightReply.missingData,
      confidence: preflightReply.confidence,
    });
    await writeAIReplyTrace({
      userId: params.settings.userId,
      connectionId: params.connectionId,
      contextBundle,
      reply: preflightReply,
      latencyMs: Date.now() - startedAt,
    });
    return preflightReply;
  }

  const prompt = interpolateSystemPrompt(params.systemPrompt, params.settings, contextBundle, {
    extraInstructions: params.extraInstructions,
    forceEgyptianArabic: params.forceEgyptianArabic,
    channel: params.channel,
  });

  try {
    const completion = await openai.chat.completions.create({
      model: appEnv.OPENAI_MODEL,
      temperature: 0.2,
      max_tokens: resolveMaxTokens(params.settings.maxReplyLength),
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: params.userMessage },
      ],
    });

    const rawReplyText = completion.choices[0]?.message?.content?.trim();

    if (!rawReplyText) {
      throw new AIReplyError("OPENAI_INVALID_RESPONSE", "OpenAI returned an empty reply.");
    }

    const result = parseStructuredReply(rawReplyText, contextBundle, completion.model, completion.usage?.total_tokens ?? 0);

    logger.info("openai.generateAIReply", "Generated AI reply.", {
      modelUsed: result.modelUsed,
      tokensUsed: result.tokensUsed,
      confidence: result.confidence,
      sourceCount: result.sources.length,
      needsHuman: result.needsHuman,
    });

    await writeAIReplyTrace({
      userId: params.settings.userId,
      connectionId: params.connectionId,
      contextBundle,
      reply: result,
      latencyMs: Date.now() - startedAt,
    });

    return result;
  } catch (error) {
    await writeAIReplyTrace({
      userId: params.settings.userId,
      connectionId: params.connectionId,
      contextBundle,
      latencyMs: Date.now() - startedAt,
      model: appEnv.OPENAI_MODEL,
      failureReason: mapAIReplyFailureReason(error),
    });

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
