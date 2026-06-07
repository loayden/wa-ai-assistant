// FILE: src/lib/observability/redaction.ts
/*
 * [ROLE: SECURITY ENGINEER]
 * Decision: Operational observability must retain enough evidence to debug
 * failures without persisting provider credentials or request secrets.
 */
import { Prisma } from "@prisma/client";

type JsonObject = Record<string, unknown>;

const SENSITIVE_OBSERVABILITY_KEY_PATTERN =
  /access[_-]?token|page[_-]?token|authorization|api[_-]?key|secret|password|signature|hmac|cookie|client[_-]?secret|verify[_-]?token/i;
const REDACTED = "[redacted]";

export function sanitizeObservabilityValue(value: unknown, key?: string): unknown {
  if (key && SENSITIVE_OBSERVABILITY_KEY_PATTERN.test(key)) {
    return REDACTED;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeObservabilityValue(item, key));
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as JsonObject).map(([nestedKey, nestedValue]) => [
        nestedKey,
        sanitizeObservabilityValue(nestedValue, nestedKey),
      ]),
    );
  }

  return value;
}

export function toObservabilityJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === null || value === undefined) {
    return Prisma.JsonNull;
  }

  return sanitizeObservabilityValue(value) as Prisma.InputJsonValue;
}
