import "server-only";

import { MessageDirection, MessageStatus, OutboundMessageStatus, type OutboundMessage, type Prisma } from "@prisma/client";

import { getAdapter, type MessagingChannel } from "@/lib/channels";
import { prisma } from "@/lib/prisma/client";
import { buildOutboundAttemptMetadata, classifyOutboundFailure, type OutboundFailureClassification } from "@/lib/reliability/outbound";
import { decrypt } from "@/lib/utils/encryption";
import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";

export const OUTBOX_CRON_BATCH_SIZE = 25;

type OutboundDirection = "manual" | "auto" | "system";

type CreateOutboundDeliveryInput = {
  userId: string;
  connectionId: string;
  relatedMessageId?: string | null;
  channel: MessagingChannel;
  direction: OutboundDirection;
  senderId: string;
  recipientId: string;
  bodyText: string;
  externalThreadId?: string | null;
  idempotencyKey?: string;
  maxAttempts?: number;
  metadata?: Prisma.InputJsonObject;
};

type SendTrackedChannelTextInput = CreateOutboundDeliveryInput & {
  accessToken: string;
  pageId?: string | null;
  phoneNumberId?: string | null;
};

type TrackedSendSuccess = {
  success: true;
  outbox: OutboundMessage;
  externalMessageId?: string;
};

type TrackedSendFailure = {
  success: false;
  outbox: OutboundMessage;
  failure: OutboundFailureClassification;
};

type ProcessOutboundQueueOptions = {
  batchSize?: number;
};

function jsonObject(value: Prisma.JsonValue | Prisma.InputJsonValue | null | undefined): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function isMessagingChannel(value: string): value is MessagingChannel {
  return value === "whatsapp" || value === "instagram" || value === "messenger";
}

function retryDelayMs(attemptCount: number): number {
  const delays = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000];
  return delays[Math.max(0, Math.min(attemptCount - 1, delays.length - 1))] ?? delays[delays.length - 1];
}

function failureStatus(params: {
  failure: OutboundFailureClassification;
  attemptCount: number;
  maxAttempts: number;
}): OutboundMessageStatus {
  if (!params.failure.retry.canRetry) {
    return OutboundMessageStatus.BLOCKED;
  }

  return params.attemptCount < params.maxAttempts ? OutboundMessageStatus.FAILED : OutboundMessageStatus.BLOCKED;
}

function nextAttemptAt(params: {
  failure: OutboundFailureClassification;
  attemptCount: number;
  maxAttempts: number;
}): Date | null {
  if (!params.failure.retry.canRetry || params.attemptCount >= params.maxAttempts) {
    return null;
  }

  return new Date(Date.now() + retryDelayMs(params.attemptCount));
}

function outboundWaMessageId(channel: MessagingChannel, providerMessageId: string | undefined) {
  return providerMessageId ? `${channel}:${providerMessageId}` : `${channel}:retry:${crypto.randomUUID()}`;
}

export function buildOutboxIdempotencyKey(params: {
  channel: MessagingChannel;
  direction: OutboundDirection;
  relatedMessageId?: string | null;
  recipientId: string;
}) {
  const owner = params.relatedMessageId ?? crypto.randomUUID();
  return `${params.channel}:${params.direction}:${owner}:${params.recipientId}`;
}

export async function createOutboundDelivery(
  input: CreateOutboundDeliveryInput,
  client: Pick<Prisma.TransactionClient, "outboundMessage"> = prisma,
) {
  return client.outboundMessage.create({
    data: {
      userId: input.userId,
      connectionId: input.connectionId,
      relatedMessageId: input.relatedMessageId ?? null,
      idempotencyKey: input.idempotencyKey ?? buildOutboxIdempotencyKey(input),
      channel: input.channel,
      direction: input.direction,
      senderId: input.senderId,
      recipientId: input.recipientId,
      bodyText: input.bodyText,
      externalThreadId: input.externalThreadId ?? null,
      status: OutboundMessageStatus.PENDING,
      attemptCount: 0,
      maxAttempts: input.maxAttempts ?? 3,
      nextAttemptAt: null,
      lastAttemptAt: new Date(),
      metadata: {
        ...jsonObject(input.metadata),
        outboundAttempt: buildOutboundAttemptMetadata({
          channel: input.channel,
          direction: input.direction,
          stage: "pending",
        }),
      },
    },
  });
}

export async function markOutboundDeliverySending(params: {
  outboxId: string;
  channel: MessagingChannel;
  direction: OutboundDirection;
  metadata?: Prisma.JsonValue | Prisma.InputJsonValue | null;
}) {
  return prisma.outboundMessage.update({
    where: { id: params.outboxId },
    data: {
      status: OutboundMessageStatus.SENDING,
      attemptCount: { increment: 1 },
      lastAttemptAt: new Date(),
      metadata: {
        ...jsonObject(params.metadata),
        outboundAttempt: buildOutboundAttemptMetadata({
          channel: params.channel,
          direction: params.direction,
          stage: "sending",
        }),
      },
    },
  });
}

export async function markOutboundDeliverySent(params: {
  outboxId: string;
  providerMessageId?: string | null;
  relatedMessageId?: string | null;
}) {
  return prisma.outboundMessage.update({
    where: { id: params.outboxId },
    data: {
      ...(params.relatedMessageId ? { relatedMessageId: params.relatedMessageId } : {}),
      status: OutboundMessageStatus.SENT,
      sentAt: new Date(),
      nextAttemptAt: null,
      providerMessageId: params.providerMessageId ?? null,
      failureCode: null,
      failureReason: null,
      failureActionHref: null,
    },
  });
}

export async function markOutboundDeliveryFailed(params: {
  outbox: Pick<OutboundMessage, "id" | "attemptCount" | "maxAttempts" | "channel" | "direction">;
  failure: OutboundFailureClassification;
  relatedMessageId?: string | null;
}) {
  const status = failureStatus({
    failure: params.failure,
    attemptCount: params.outbox.attemptCount,
    maxAttempts: params.outbox.maxAttempts,
  });

  return prisma.outboundMessage.update({
    where: { id: params.outbox.id },
    data: {
      ...(params.relatedMessageId ? { relatedMessageId: params.relatedMessageId } : {}),
      status,
      nextAttemptAt: nextAttemptAt({
        failure: params.failure,
        attemptCount: params.outbox.attemptCount,
        maxAttempts: params.outbox.maxAttempts,
      }),
      failureCode: params.failure.code,
      failureReason: params.failure.userMessage,
      failureActionHref: params.failure.actionHref,
      metadata: {
        outboundAttempt: buildOutboundAttemptMetadata({
          channel: isMessagingChannel(params.outbox.channel) ? params.outbox.channel : "whatsapp",
          direction: ["manual", "auto", "system"].includes(params.outbox.direction)
            ? (params.outbox.direction as OutboundDirection)
            : "system",
          stage: status === OutboundMessageStatus.FAILED ? "failed" : "blocked",
          failure: params.failure,
        }),
        failure: params.failure,
      },
    },
  });
}

export async function sendTrackedChannelText(
  input: SendTrackedChannelTextInput,
): Promise<TrackedSendSuccess | TrackedSendFailure> {
  const pendingOutbox = await createOutboundDelivery(input);
  const outbox = await markOutboundDeliverySending({
    outboxId: pendingOutbox.id,
    channel: input.channel,
    direction: input.direction,
    metadata: pendingOutbox.metadata,
  });
  const adapter = getAdapter(input.channel);

  try {
    const sendResult = await adapter.sendText({
      connectionId: input.connectionId,
      recipientId: input.recipientId,
      text: input.bodyText,
      accessToken: input.accessToken,
      pageId: input.pageId ?? undefined,
      phoneNumberId: input.phoneNumberId ?? undefined,
    });

    if (!sendResult.success) {
      const failure = classifyOutboundFailure({ channel: input.channel, providerError: sendResult.error });
      await markOutboundDeliveryFailed({ outbox, failure });
      return { success: false, outbox, failure };
    }

    await markOutboundDeliverySent({
      outboxId: outbox.id,
      providerMessageId: sendResult.externalMessageId,
    });

    return {
      success: true,
      outbox,
      externalMessageId: sendResult.externalMessageId,
    };
  } catch (error) {
    const failure = classifyOutboundFailure({ channel: input.channel, error });
    await markOutboundDeliveryFailed({ outbox, failure });
    return { success: false, outbox, failure };
  }
}

async function updateRelatedMessageAfterRetry(params: {
  outbox: OutboundMessage;
  providerMessageId?: string;
}) {
  const relatedMessage = params.outbox.relatedMessageId
    ? await prisma.message.findUnique({
        where: { id: params.outbox.relatedMessageId },
        select: { id: true, direction: true, metadata: true },
      })
    : null;
  const outboundAttempt = buildOutboundAttemptMetadata({
    channel: params.outbox.channel as MessagingChannel,
    direction: params.outbox.direction as OutboundDirection,
    stage: "sent",
    providerMessageId: params.providerMessageId,
  });

  if (relatedMessage?.direction === MessageDirection.OUTBOUND) {
    await prisma.message.update({
      where: { id: relatedMessage.id },
      data: {
        status: MessageStatus.REPLIED,
        externalMessageId: params.providerMessageId ?? null,
        metadata: {
          ...jsonObject(relatedMessage.metadata),
          outboxId: params.outbox.id,
          outboundAttempt,
        },
        processedAt: new Date(),
      },
    });
    return relatedMessage.id;
  }

  const createdMessage = await prisma.message.create({
    data: {
      userId: params.outbox.userId,
      connectionId: params.outbox.connectionId,
      waMessageId: outboundWaMessageId(params.outbox.channel as MessagingChannel, params.providerMessageId),
      direction: MessageDirection.OUTBOUND,
      fromNumber: params.outbox.senderId,
      toNumber: params.outbox.recipientId,
      bodyText: params.outbox.bodyText,
      status: MessageStatus.REPLIED,
      aiModelUsed: `retry-${params.outbox.direction}`,
      channel: params.outbox.channel,
      externalMessageId: params.providerMessageId ?? null,
      externalThreadId: params.outbox.externalThreadId,
      metadata: {
        outboxId: params.outbox.id,
        outboundAttempt,
      },
      processedAt: new Date(),
    },
  });

  if (relatedMessage) {
    await prisma.message.update({
      where: { id: relatedMessage.id },
      data: {
        status: MessageStatus.REPLIED,
        aiReplyText: params.outbox.bodyText,
        metadata: {
          ...jsonObject(relatedMessage.metadata),
          outboxId: params.outbox.id,
          outboundAttempt,
        },
        processedAt: new Date(),
      },
    });
  }

  return createdMessage.id;
}

export async function processOutboundQueue(options: ProcessOutboundQueueOptions = {}) {
  const batchSize = options.batchSize ?? OUTBOX_CRON_BATCH_SIZE;
  const candidates = await prisma.outboundMessage.findMany({
    where: {
      status: OutboundMessageStatus.FAILED,
      nextAttemptAt: {
        lte: new Date(),
      },
    },
    orderBy: [{ nextAttemptAt: "asc" }, { createdAt: "asc" }],
    take: batchSize,
    include: {
      connection: true,
    },
  });
  let retried = 0;
  let sent = 0;
  let failed = 0;
  let blocked = 0;
  let skipped = 0;

  for (const candidate of candidates) {
    if (!isMessagingChannel(candidate.channel) || candidate.attemptCount >= candidate.maxAttempts) {
      await prisma.outboundMessage.update({
        where: { id: candidate.id },
        data: { status: OutboundMessageStatus.BLOCKED, nextAttemptAt: null },
      });
      blocked += 1;
      continue;
    }

    const claimed = await prisma.outboundMessage.updateMany({
      where: {
        id: candidate.id,
        status: OutboundMessageStatus.FAILED,
      },
      data: {
        status: OutboundMessageStatus.RETRYING,
        attemptCount: { increment: 1 },
        lastAttemptAt: new Date(),
        metadata: {
          ...jsonObject(candidate.metadata),
          outboundAttempt: buildOutboundAttemptMetadata({
            channel: candidate.channel,
            direction: candidate.direction as OutboundDirection,
            stage: "retrying",
          }),
        },
      },
    });

    if (claimed.count === 0) {
      skipped += 1;
      continue;
    }

    retried += 1;

    const attemptOutbox = {
      ...candidate,
      attemptCount: candidate.attemptCount + 1,
    };
    const accessToken = appEnv.WHATSAPP_MOCK_MODE
      ? ""
      : candidate.channel === "whatsapp"
        ? decrypt(candidate.connection.accessToken)
        : decrypt(candidate.connection.pageAccessTokenEncrypted ?? candidate.connection.accessToken);
    const adapter = getAdapter(candidate.channel);

    try {
      const sendResult = await adapter.sendText({
        connectionId: candidate.connectionId,
        recipientId: candidate.recipientId,
        text: candidate.bodyText,
        accessToken,
        pageId: candidate.connection.facebookPageId ?? undefined,
        phoneNumberId: candidate.senderId,
      });

      if (!sendResult.success) {
        const failure = classifyOutboundFailure({ channel: candidate.channel, providerError: sendResult.error });
        await markOutboundDeliveryFailed({ outbox: attemptOutbox, failure });
        if (failure.retry.canRetry && attemptOutbox.attemptCount < attemptOutbox.maxAttempts) failed += 1;
        else blocked += 1;
        continue;
      }

      const visibleMessageId = await updateRelatedMessageAfterRetry({
        outbox: candidate,
        providerMessageId: sendResult.externalMessageId,
      });
      await markOutboundDeliverySent({
        outboxId: candidate.id,
        providerMessageId: sendResult.externalMessageId,
        relatedMessageId: visibleMessageId,
      });
      sent += 1;
    } catch (error) {
      const failure = classifyOutboundFailure({ channel: candidate.channel, error });
      await markOutboundDeliveryFailed({ outbox: attemptOutbox, failure });
      if (failure.retry.canRetry && attemptOutbox.attemptCount < attemptOutbox.maxAttempts) failed += 1;
      else blocked += 1;
      logger.warn("reliability.outbox", "Outbound retry failed.", {
        error,
        outboxId: candidate.id,
        failureCode: failure.code,
      });
    }
  }

  return {
    candidates: candidates.length,
    retried,
    sent,
    failed,
    blocked,
    skipped,
  };
}
