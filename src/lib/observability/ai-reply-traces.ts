// FILE: src/lib/observability/ai-reply-traces.ts
/*
 * [ROLE: AI PRODUCT/SRE ENGINEER]
 * Decision: AI trace persistence is best-effort. It should make every answer
 * explainable without blocking customer replies if observability storage fails.
 */
import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/utils/logger";
import type { AIContextBundle } from "@/lib/ai/context-builder";
import type { GenerateAIReplyResult } from "@/lib/openai/client";
import { toObservabilityJson } from "@/lib/observability/redaction";

type AIReplyTraceCreateInput = {
  userId: string;
  connectionId?: string | null;
  messageId?: string | null;
  contextBundle: AIContextBundle;
  reply?: GenerateAIReplyResult;
  latencyMs?: number;
  model?: string;
  failureReason?: string;
};

type PrismaWithAIReplyTrace = typeof prisma & {
  aiReplyTrace?: {
    create: (args: {
      data: {
        userId: string;
        connectionId?: string | null;
        messageId?: string | null;
        traceId: string;
        contextBundle: ReturnType<typeof toObservabilityJson>;
        replyText?: string | null;
        confidence?: number | null;
        sources: ReturnType<typeof toObservabilityJson>;
        missingData: ReturnType<typeof toObservabilityJson>;
        needsHuman: boolean;
        suggestedAction?: string | null;
        outsideWorkingHours: boolean;
        latencyMs?: number | null;
        model?: string | null;
        tokensUsed?: number | null;
        failureReason?: string | null;
      };
    }) => Promise<unknown>;
  };
};

function buildContextSnapshot(contextBundle: AIContextBundle) {
  return {
    contextVersion: "ai-context-v1",
    userId: contextBundle.userId,
    businessName: contextBundle.businessName,
    language: contextBundle.language,
    maxReplyLength: contextBundle.maxReplyLength,
    outsideWorkingHours: contextBundle.outsideWorkingHours,
    hasGroundingContext: contextBundle.hasGroundingContext,
    sourceCount: contextBundle.sources.length,
    sources: contextBundle.sources,
    products: contextBundle.products,
    promptSections: contextBundle.promptSections,
  };
}

export async function writeAIReplyTrace(input: AIReplyTraceCreateInput): Promise<void> {
  try {
    const aiReplyTrace = (prisma as PrismaWithAIReplyTrace).aiReplyTrace;

    if (!aiReplyTrace) {
      logger.warn("observability.aiReplyTrace", "AI reply trace model is not generated yet; skipped trace write.", {
        userId: input.userId,
        failureReason: input.failureReason,
      });
      return;
    }

    await aiReplyTrace.create({
      data: {
        userId: input.userId,
        connectionId: input.connectionId ?? null,
        messageId: input.messageId ?? null,
        traceId: input.reply?.trace.id ?? randomUUID(),
        contextBundle: toObservabilityJson(buildContextSnapshot(input.contextBundle)),
        replyText: input.reply?.replyText ?? null,
        confidence: input.reply?.confidence ?? null,
        sources: toObservabilityJson(
          input.reply?.sources.map((source) => ({
            id: source.id,
            type: source.type,
            title: source.title,
          })) ?? [],
        ),
        missingData: toObservabilityJson(input.reply?.missingData ?? []),
        needsHuman: input.reply?.needsHuman ?? true,
        suggestedAction: input.reply?.suggestedAction ?? null,
        outsideWorkingHours: input.reply?.outsideWorkingHours ?? input.contextBundle.outsideWorkingHours,
        latencyMs: input.latencyMs ?? null,
        model: input.reply?.modelUsed ?? input.model ?? null,
        tokensUsed: input.reply?.tokensUsed ?? null,
        failureReason: input.failureReason ?? null,
      },
    });
  } catch (error) {
    logger.warn("observability.aiReplyTrace", "AI reply trace write failed without blocking reply.", {
      error,
      userId: input.userId,
      failureReason: input.failureReason,
    });
  }
}
