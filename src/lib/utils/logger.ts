// FILE: src/lib/utils/logger.ts
/*
 * [ROLE: DEVOPS ENGINEER]
 * Decision: Centralized structured logging keeps API routes and integrations
 * consistent while preserving readable console output during local development.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogMetadata = Record<string, unknown>;

export type LogRecord = {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  metadata?: LogMetadata;
};

export type BoundLogger = {
  debug: (message: string, metadata?: LogMetadata) => void;
  info: (message: string, metadata?: LogMetadata) => void;
  warn: (message: string, metadata?: LogMetadata) => void;
  error: (message: string, metadata?: LogMetadata) => void;
};

const consoleByLevel: Record<LogLevel, (message?: unknown, ...optionalParams: unknown[]) => void> = {
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error,
};

const SENSITIVE_METADATA_KEY_PATTERN =
  /access[_-]?token|authorization|api[_-]?key|secret|password|signature|hmac|cookie|raw[_-]?body|payload|client[_-]?secret/i;
const REDACTED_VALUE = "[redacted]";

function isSensitiveMetadataKey(key?: string): boolean {
  return Boolean(key && SENSITIVE_METADATA_KEY_PATTERN.test(key));
}

function normalizeValue(value: unknown, key?: string): unknown {
  if (isSensitiveMetadataKey(key)) {
    return REDACTED_VALUE;
  }

  if (value instanceof Error) {
    const normalizedError: Record<string, string | undefined> = {
      name: value.name,
      message: value.message,
    };

    if (process.env.NODE_ENV !== "production") {
      normalizedError.stack = value.stack;
    }

    return normalizedError;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item, key));
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
        key,
        normalizeValue(nestedValue, key),
      ]),
    );
  }

  return value;
}

function normalizeMetadata(metadata?: LogMetadata): LogMetadata | undefined {
  if (!metadata) {
    return undefined;
  }

  return normalizeValue(metadata) as LogMetadata;
}

function createRecord(level: LogLevel, context: string, message: string, metadata?: LogMetadata): LogRecord {
  return {
    timestamp: new Date().toISOString(),
    level,
    context,
    message,
    metadata: normalizeMetadata(metadata),
  };
}

function writeRecord(record: LogRecord): void {
  const write = consoleByLevel[record.level];

  if (process.env.NODE_ENV === "production") {
    write(JSON.stringify(record));
    return;
  }

  const metadata = record.metadata ? ` ${JSON.stringify(record.metadata)}` : "";
  write(`[${record.timestamp}] ${record.level.toUpperCase()} ${record.context}: ${record.message}${metadata}`);
}

export function log(level: LogLevel, context: string, message: string, metadata?: LogMetadata): void {
  writeRecord(createRecord(level, context, message, metadata));
}

export const logger = {
  debug: (context: string, message: string, metadata?: LogMetadata) => log("debug", context, message, metadata),
  info: (context: string, message: string, metadata?: LogMetadata) => log("info", context, message, metadata),
  warn: (context: string, message: string, metadata?: LogMetadata) => log("warn", context, message, metadata),
  error: (context: string, message: string, metadata?: LogMetadata) => log("error", context, message, metadata),
};

export function createLogger(context: string): BoundLogger {
  return {
    debug: (message, metadata) => logger.debug(context, message, metadata),
    info: (message, metadata) => logger.info(context, message, metadata),
    warn: (message, metadata) => logger.warn(context, message, metadata),
    error: (message, metadata) => logger.error(context, message, metadata),
  };
}
