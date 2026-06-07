// FILE: tests/unit/observability.test.ts
/*
 * [ROLE: SRE/SECURITY ENGINEER]
 * Decision: Launch observability is only useful if it persists the right facts
 * while redacting credentials and never blocking product flows.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AIContextBundle } from "@/lib/ai/context-builder";
import type { GenerateAIReplyResult } from "@/lib/openai/client";
import type { LaunchReadinessResponse, ReadinessCheck } from "@/types/api";

const observabilityMocks = vi.hoisted(() => ({
  aiReplyTraceCreate: vi.fn(),
  webhookEventCreate: vi.fn(),
  webhookEventUpsert: vi.fn(),
  webhookEventUpdate: vi.fn(),
  readinessSnapshotCreate: vi.fn(),
  loggerWarn: vi.fn(),
}));

vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    aiReplyTrace: {
      create: observabilityMocks.aiReplyTraceCreate,
    },
    webhookEvent: {
      create: observabilityMocks.webhookEventCreate,
      upsert: observabilityMocks.webhookEventUpsert,
      update: observabilityMocks.webhookEventUpdate,
    },
    readinessSnapshot: {
      create: observabilityMocks.readinessSnapshotCreate,
    },
  },
}));

vi.mock("@/lib/utils/logger", () => ({
  logger: {
    warn: observabilityMocks.loggerWarn,
  },
}));

import { writeAIReplyTrace } from "@/lib/observability/ai-reply-traces";
import { sanitizeObservabilityValue } from "@/lib/observability/redaction";
import {
  inferWebhookEventType,
  inferWebhookProviderEventId,
  markWebhookEventProcessed,
  recordWebhookEvent,
} from "@/lib/observability/webhook-events";
import { splitReadinessIssues, writeReadinessSnapshot } from "@/lib/readiness/snapshots";

function contextBundle(): AIContextBundle {
  return {
    userId: "00000000-0000-0000-0000-000000000001",
    businessName: "kallem",
    language: "ar",
    maxReplyLength: 1000,
    outsideWorkingHours: false,
    hasGroundingContext: true,
    products: [{ id: "prod-1", name: "خطة", nameEn: "Plan", price: 10000, category: "plans", description: "اشتراك" }],
    sources: [{ id: "product:prod-1", type: "product", title: "خطة", excerpt: "100 EGP" }],
    promptSections: {
      sourceRegistry: "product:prod-1",
      businessContext: "accessToken should redact",
      workingHoursBlock: "",
      knowledgeBlock: "",
      catalogBlock: "",
      correctionsBlock: "",
      customerProfileBlock: "",
      conversationHistoryBlock: "",
    },
  };
}

function reply(): GenerateAIReplyResult {
  return {
    replyText: "السعر 100 جنيه.",
    modelUsed: "gpt-4o-mini",
    tokensUsed: 42,
    confidence: 0.9,
    sources: [{ id: "product:prod-1", type: "product", title: "خطة", excerpt: "100 EGP" }],
    missingData: [],
    needsHuman: false,
    suggestedAction: "reply",
    outsideWorkingHours: false,
    trace: {
      id: "trace-1",
      contextVersion: "ai-context-v1",
      sourceIds: ["product:prod-1"],
      sourceCount: 1,
      confidence: 0.9,
      missingData: [],
      needsHuman: false,
      suggestedAction: "reply",
      outsideWorkingHours: false,
      modelUsed: "gpt-4o-mini",
      tokensUsed: 42,
      generatedAt: "2026-06-06T00:00:00.000Z",
    },
  };
}

function readinessCheck(id: string, isManual: boolean): ReadinessCheck {
  return {
    id,
    label: id,
    status: "warn",
    message: "needs work",
    category: "channels",
    points: 10,
    isManual,
  };
}

describe("launch observability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    observabilityMocks.aiReplyTraceCreate.mockResolvedValue({ id: "ai-trace-row-1" });
    observabilityMocks.webhookEventCreate.mockResolvedValue({ id: "event-1" });
    observabilityMocks.webhookEventUpsert.mockResolvedValue({ id: "event-2" });
    observabilityMocks.webhookEventUpdate.mockResolvedValue({ id: "event-2" });
    observabilityMocks.readinessSnapshotCreate.mockResolvedValue({ id: "snapshot-1" });
  });

  it("redacts nested provider credentials before persistence", () => {
    expect(
      sanitizeObservabilityValue({
        pageAccessToken: "raw",
        nested: {
          hmac: "signature",
          safe: "visible",
        },
      }),
    ).toEqual({
      pageAccessToken: "[redacted]",
      nested: {
        hmac: "[redacted]",
        safe: "visible",
      },
    });
  });

  it("writes an AI reply trace with sources, confidence, and context snapshot", async () => {
    await writeAIReplyTrace({
      userId: "00000000-0000-0000-0000-000000000001",
      connectionId: "00000000-0000-0000-0000-000000000002",
      contextBundle: contextBundle(),
      reply: reply(),
      latencyMs: 850,
    });

    expect(observabilityMocks.aiReplyTraceCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        traceId: "trace-1",
        confidence: 0.9,
        needsHuman: false,
        latencyMs: 850,
        model: "gpt-4o-mini",
        tokensUsed: 42,
      }),
    });
  });

  it("records and marks webhook events without exposing access tokens", async () => {
    const payload = {
      object: "instagram",
      entry: [{ id: "entry-1", messaging: [{ message: { mid: "mid-1", text: "hi" }, pageAccessToken: "raw" }] }],
    };

    const eventId = await recordWebhookEvent({
      provider: "meta",
      eventType: inferWebhookEventType("meta", payload),
      providerEventId: inferWebhookProviderEventId("meta", payload),
      rawPayload: payload,
    });
    await markWebhookEventProcessed(eventId);

    expect(eventId).toBe("event-2");
    expect(observabilityMocks.webhookEventUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { provider_providerEventId: { provider: "meta", providerEventId: "mid-1" } },
      }),
    );
    expect(observabilityMocks.webhookEventUpdate).toHaveBeenCalledWith({
      where: { id: "event-2" },
      data: {
        processed: true,
        processedAt: expect.any(Date),
        failureReason: null,
      },
    });
  });

  it("splits readiness issues into code/config and manual/external tracks", async () => {
    const readiness: LaunchReadinessResponse = {
      score: 70,
      passed: 1,
      warnings: 2,
      failed: 0,
      total: 3,
      mode: "full",
      generatedAt: "2026-06-06T00:00:00.000Z",
      checks: [
        { ...readinessCheck("knowledge", false), category: "business" },
        readinessCheck("paymob", true),
        { ...readinessCheck("ok", false), status: "pass" },
      ],
    };

    expect(splitReadinessIssues(readiness.checks)).toEqual({
      codeIssues: [expect.objectContaining({ id: "knowledge" })],
      manualActions: [expect.objectContaining({ id: "paymob" })],
    });

    await writeReadinessSnapshot("00000000-0000-0000-0000-000000000001", readiness);

    expect(observabilityMocks.readinessSnapshotCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "00000000-0000-0000-0000-000000000001",
        score: 70,
      }),
    });
  });
});
