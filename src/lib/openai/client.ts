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

import { buildKnowledgeBlock } from "@/lib/api/knowledge";
import type { MessagingChannel } from "@/lib/channels/types";
import { prisma } from "@/lib/prisma/client";
import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";

export type GenerateAIReplyParams = {
  systemPrompt: string;
  userMessage: string;
  settings: UserSettings;
  extraInstructions?: string[];
  forceEgyptianArabic?: boolean;
  channel?: MessagingChannel;
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

async function getKnowledgePromptBlock(userId: string): Promise<string> {
  const entries = await prisma.knowledgeBaseEntry.findMany({
    where: { userId },
    select: {
      type: true,
      title: true,
      content: true,
    },
    orderBy: [{ type: "asc" }, { updatedAt: "desc" }],
  });

  return buildKnowledgeBlock(entries);
}

async function getCatalogPromptBlock(userId: string): Promise<string> {
  const products = await prisma.product.findMany({
    where: {
      userId,
      isAvailable: true,
    },
    select: {
      id: true,
      name: true,
      nameEn: true,
      description: true,
      price: true,
      category: true,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    take: 100,
  });

  if (!products.length) {
    return "";
  }

  const productLines = products.map((product) => {
    const priceEGP = (product.price / 100).toFixed(0);
    const description = product.description ? ` - ${product.description}` : "";
    const englishName = product.nameEn ? ` / ${product.nameEn}` : "";
    const category = product.category ? ` (${product.category})` : "";

    return `- ${product.name}${englishName}${category}: ${priceEGP} EGP${description}`;
  });

  return [
    "Available product catalog:",
    ...productLines,
    "",
    "Order handling rule:",
    "If the customer clearly wants to order available products, reply with a short order summary, total, and ask for delivery address if needed.",
    'At the very end of your reply, add this hidden machine-readable line exactly: [[ORDER: { "items": [{ "name": "Product name", "qty": 1, "unit_price": 10000 }], "subtotal": 10000 }]]',
    "Use integer piastres for unit_price and subtotal. Do not add the ORDER line unless there is a clear order intent.",
  ].join("\n");
}

async function getCorrectionsPromptBlock(userId: string): Promise<string> {
  const corrections = await prisma.aiCorrection.findMany({
    where: { userId },
    select: {
      originalCustomerMessage: true,
      wrongAiReply: true,
      correctReply: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  if (!corrections.length) {
    return "";
  }

  return [
    "Business-specific correction examples. Learn from these and do not repeat the wrong replies:",
    ...corrections.map(
      (correction) =>
        `Customer: "${correction.originalCustomerMessage}"\nWrong reply: "${correction.wrongAiReply}"\nCorrect reply: "${correction.correctReply}"`,
    ),
  ].join("\n\n");
}

function interpolateSystemPrompt(
  systemPrompt: string,
  settings: UserSettings,
  promptSections: {
    knowledgeBlock: string;
    catalogBlock: string;
    correctionsBlock: string;
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

  if (settings.businessContext?.trim()) {
    sections.push(`Business context:\n${settings.businessContext.trim()}`);
  }

  if (promptSections.forceEgyptianArabic) {
    sections.push("Reply in friendly Egyptian Arabic. Do not use stiff formal Arabic unless the customer does.");
  }

  if (promptSections.channel) {
    const channelToneGuide: Record<MessagingChannel, string> = {
      whatsapp: "أسلوب مختصر ومباشر، مناسب للجوال.",
      instagram: "أسلوب اجتماعي وودود، قصير، يناسب جمهور إنستجرام.",
      messenger: "أسلوب محترف وودود، مناسب للتواصل عبر فيسبوك.",
    };

    sections.push(`Channel style note: ${channelToneGuide[promptSections.channel]}`);

    if (promptSections.channel === "instagram") {
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

    if (promptSections.channel === "messenger") {
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

  if (promptSections.knowledgeBlock) {
    sections.push(promptSections.knowledgeBlock.trim());
  }

  if (promptSections.catalogBlock) {
    sections.push(promptSections.catalogBlock.trim());
  }

  if (promptSections.correctionsBlock) {
    sections.push(promptSections.correctionsBlock.trim());
  }

  if (promptSections.extraInstructions?.length) {
    sections.push(`Routing instructions for this message:\n${promptSections.extraInstructions.map((instruction) => `- ${instruction}`).join("\n")}`);
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

export async function generateAIReply(params: GenerateAIReplyParams): Promise<GenerateAIReplyResult> {
  const [knowledgeBlock, catalogBlock, correctionsBlock] = await Promise.all([
    getKnowledgePromptBlock(params.settings.userId),
    getCatalogPromptBlock(params.settings.userId),
    getCorrectionsPromptBlock(params.settings.userId),
  ]);
  const prompt = interpolateSystemPrompt(params.systemPrompt, params.settings, {
    knowledgeBlock,
    catalogBlock,
    correctionsBlock,
    extraInstructions: params.extraInstructions,
    forceEgyptianArabic: params.forceEgyptianArabic,
    channel: params.channel,
  });

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
