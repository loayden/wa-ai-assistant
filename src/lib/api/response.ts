// FILE: src/lib/api/response.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: API responses share one typed envelope so route handlers return
 * predictable success, validation, and error payloads across backend surfaces.
 */
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import type { ZodError } from "zod";

import { logger } from "@/lib/utils/logger";
import type { ApiResponse } from "@/types/api";

const DATABASE_CONNECTION_ERROR_CODES = new Set(["P1000", "P1001", "P1002", "P1008", "P1017"]);

export function jsonSuccess<T>(data: T, init?: ResponseInit & { meta?: Record<string, unknown> }): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: init?.meta,
    },
    init,
  );
}

export function jsonError(
  error: string,
  status = 500,
  meta?: Record<string, unknown>,
): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    {
      success: false,
      error,
      meta,
    },
    { status },
  );
}

/**
 * [ROLE: BACKEND ENGINEER]
 * Decision: Database connectivity failures are transient infrastructure errors,
 * so API routes expose 503 and log retry guidance instead of a generic 500.
 */
export function isDatabaseConnectionError(error: unknown): boolean {
  if (
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientRustPanicError ||
    (error instanceof Prisma.PrismaClientKnownRequestError && DATABASE_CONNECTION_ERROR_CODES.has(error.code))
  ) {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);

  return /can't reach database|database server|connection terminated|connection refused|econnrefused|timed out fetching a new connection/i.test(
    message,
  );
}

export function jsonDatabaseUnavailableIfNeeded(
  context: string,
  error: unknown,
): NextResponse<ApiResponse<never>> | null {
  if (!isDatabaseConnectionError(error)) {
    return null;
  }

  logger.error(context, "Database connection unavailable. Retry after database connectivity is restored.", {
    error,
    retry: "Retry this request after database connectivity is restored.",
  });

  return jsonError("Database temporarily unavailable. Please retry shortly.", 503, {
    retry: "Retry after a short delay.",
  });
}

export function jsonValidationError(error: ZodError): NextResponse<ApiResponse<never>> {
  return jsonError("Validation failed.", 422, {
    issues: error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  });
}

export function jsonMethodNotAllowed(method: string): NextResponse<ApiResponse<never>> {
  return jsonError("هذا الإجراء غير متاح من هذه الشاشة.", 405, { method });
}
