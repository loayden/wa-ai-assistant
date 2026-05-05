// FILE: src/lib/prisma/client.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Prisma clients are expensive to recreate during Next.js hot reload,
 * so development reuses a global singleton while production uses one module
 * instance per process.
 */
import "server-only";

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
