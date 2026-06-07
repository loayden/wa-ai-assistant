// FILE: src/lib/readiness/snapshots.ts
/*
 * [ROLE: PRODUCT/SRE ENGINEER]
 * Decision: Launch readiness snapshots are best-effort evidence. They help
 * owners and support understand readiness drift without slowing the dashboard.
 */
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/utils/logger";
import { toObservabilityJson } from "@/lib/observability/redaction";
import type { LaunchReadinessResponse, ReadinessCheck } from "@/types/api";

type PrismaWithReadinessSnapshot = typeof prisma & {
  readinessSnapshot?: {
    create: (args: {
      data: {
        userId: string;
        score: number;
        checks: ReturnType<typeof toObservabilityJson>;
        codeIssues: ReturnType<typeof toObservabilityJson>;
        manualActions: ReturnType<typeof toObservabilityJson>;
      };
    }) => Promise<unknown>;
  };
};

function compactCheck(check: ReadinessCheck) {
  return {
    id: check.id,
    label: check.label,
    status: check.status,
    message: check.message,
    category: check.category,
    action: check.action,
    actionHref: check.actionHref,
    isManual: check.isManual ?? false,
  };
}

export function splitReadinessIssues(checks: ReadinessCheck[]) {
  const unresolved = checks.filter((check) => check.status !== "pass").map(compactCheck);

  return {
    codeIssues: unresolved.filter((check) => !check.isManual),
    manualActions: unresolved.filter((check) => check.isManual),
  };
}

export async function writeReadinessSnapshot(userId: string, readiness: LaunchReadinessResponse): Promise<void> {
  try {
    const readinessSnapshot = (prisma as PrismaWithReadinessSnapshot).readinessSnapshot;

    if (!readinessSnapshot) {
      logger.warn("readiness.snapshot", "Readiness snapshot model is not generated yet; skipped snapshot write.", {
        userId,
        score: readiness.score,
      });
      return;
    }

    const { codeIssues, manualActions } = splitReadinessIssues(readiness.checks);

    await readinessSnapshot.create({
      data: {
        userId,
        score: readiness.score,
        checks: toObservabilityJson(readiness.checks.map(compactCheck)),
        codeIssues: toObservabilityJson(codeIssues),
        manualActions: toObservabilityJson(manualActions),
      },
    });
  } catch (error) {
    logger.warn("readiness.snapshot", "Readiness snapshot write failed without blocking readiness response.", {
      error,
      userId,
      score: readiness.score,
    });
  }
}
