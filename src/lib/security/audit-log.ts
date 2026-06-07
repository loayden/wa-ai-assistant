// FILE: src/lib/security/audit-log.ts
/*
 * [ROLE: SECURITY ENGINEER]
 * Decision: Critical production actions need a best-effort audit trail, but
 * logging must never block the user path or store raw provider credentials.
 */
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/utils/logger";

type JsonObject = Record<string, unknown>;

export type AuditAction =
  | "settings.updated"
  | "channel.whatsapp.connected"
  | "channel.whatsapp.deleted"
  | "billing.checkout.created"
  | "onboarding.completed";

export type AuditLogInput = {
  userId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  before?: JsonObject | null;
  after?: JsonObject | null;
  metadata?: JsonObject;
  request?: Request;
};

type PrismaWithAuditLog = typeof prisma & {
  auditLog?: {
    create: (args: {
      data: {
        userId?: string | null;
        action: string;
        entityType: string;
        entityId?: string | null;
        before?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
        after?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
        metadata: Prisma.InputJsonValue | typeof Prisma.JsonNull;
        ipAddress?: string | null;
        userAgent?: string | null;
      };
    }) => Promise<unknown>;
  };
};

const SENSITIVE_AUDIT_KEY_PATTERN =
  /access[_-]?token|authorization|api[_-]?key|secret|password|signature|hmac|cookie|raw[_-]?body|payload|client[_-]?secret/i;
const REDACTED = "[redacted]";

function getRequestIp(request?: Request): string | null {
  if (!request) {
    return null;
  }

  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim() || null;
}

function sanitizeAuditValue(value: unknown, key?: string): unknown {
  if (key && SENSITIVE_AUDIT_KEY_PATTERN.test(key)) {
    return REDACTED;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditValue(item, key));
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as JsonObject).map(([nestedKey, nestedValue]) => [
        nestedKey,
        sanitizeAuditValue(nestedValue, nestedKey),
      ]),
    );
  }

  return value;
}

export function sanitizeAuditMetadata(value?: JsonObject | null): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (!value) {
    return Prisma.JsonNull;
  }

  return sanitizeAuditValue(value) as Prisma.InputJsonValue;
}

export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  try {
    const auditLog = (prisma as PrismaWithAuditLog).auditLog;

    if (!auditLog) {
      logger.warn("security.auditLog", "Audit log model is not generated yet; skipped audit write.", {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
      });
      return;
    }

    await auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        before: sanitizeAuditMetadata(input.before),
        after: sanitizeAuditMetadata(input.after),
        metadata: sanitizeAuditMetadata(input.metadata),
        ipAddress: getRequestIp(input.request),
        userAgent: input.request?.headers.get("user-agent") ?? null,
      },
    });
  } catch (error) {
    logger.warn("security.auditLog", "Audit log write failed without blocking request.", {
      error,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
    });
  }
}
