// FILE: src/app/api/cron/onboarding-emails/route.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: The first-user email sequence runs from one daily cron so
 * welcome, day-2 nudge, and week-1 summary each send exactly once per user.
 * Auth and signup flows are untouched — this job discovers new users by
 * createdAt and stamps each send on the user row.
 */
import { MessageDirection } from "@prisma/client";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { buildDayTwoNudgeEmail, buildWeekOneSummaryEmail, buildWelcomeEmail } from "@/lib/onboarding/emails";
import { prisma } from "@/lib/prisma/client";
import { sendEmail } from "@/lib/resend/client";
import { isAuthorizedCronRequest } from "@/lib/security/cron";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

function displayNameFor(user: { fullName: string | null; email: string }) {
  return user.fullName?.trim() || user.email;
}

async function sendWelcomeEmails(now: Date) {
  const cutoff = new Date(now.getTime() - 26 * 60 * 60 * 1000);
  const candidates = await prisma.user.findMany({
    where: { createdAt: { gte: cutoff }, welcomeEmailSentAt: null },
    select: { id: true, email: true, fullName: true },
    take: 500,
  });

  let sent = 0;

  for (const user of candidates) {
    try {
      const { subject, html } = buildWelcomeEmail(displayNameFor(user));
      await sendEmail({ to: user.email, subject, html });
      await prisma.user.update({
        where: { id: user.id },
        data: { welcomeEmailSentAt: new Date() },
        select: { id: true },
      });
      sent += 1;
    } catch (error) {
      logger.warn("api.cron.onboarding-emails", "Welcome email failed for one user.", { error, userId: user.id });
    }
  }

  return { candidates: candidates.length, sent };
}

async function sendDayTwoNudges(now: Date) {
  const oldest = new Date(now.getTime() - 4 * DAY_MS);
  const recent = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const candidates = await prisma.user.findMany({
    where: {
      createdAt: { gte: oldest, lt: recent },
      onboardingNudgeSentAt: null,
    },
    select: { id: true, email: true, fullName: true },
    take: 500,
  });

  let sent = 0;
  let skipped = 0;

  for (const user of candidates) {
    try {
      const messageCount = await prisma.message.count({ where: { userId: user.id } });

      if (messageCount > 0) {
        // Stamp so active users are never rescanned by this batch again.
        await prisma.user.update({
          where: { id: user.id },
          data: { onboardingNudgeSentAt: new Date() },
          select: { id: true },
        });
        skipped += 1;
        continue;
      }

      const { subject, html } = buildDayTwoNudgeEmail(displayNameFor(user));
      await sendEmail({ to: user.email, subject, html });
      await prisma.user.update({
        where: { id: user.id },
        data: { onboardingNudgeSentAt: new Date() },
        select: { id: true },
      });
      sent += 1;
    } catch (error) {
      logger.warn("api.cron.onboarding-emails", "Day-2 nudge failed for one user.", { error, userId: user.id });
    }
  }

  return { candidates: candidates.length, sent, skipped };
}

async function sendWeekOneSummaries(now: Date) {
  const oldest = new Date(now.getTime() - 14 * DAY_MS);
  const recent = new Date(now.getTime() - 7 * DAY_MS);
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
  const candidates = await prisma.user.findMany({
    where: {
      createdAt: { gte: oldest, lt: recent },
      weekOneSummarySentAt: null,
    },
    select: { id: true, email: true, fullName: true },
    take: 200,
  });

  let sent = 0;

  for (const user of candidates) {
    try {
      const [totalReplies, leads, latestLead, latestInbound] = await Promise.all([
        prisma.message.count({
          where: { userId: user.id, direction: MessageDirection.OUTBOUND, createdAt: { gte: weekAgo } },
        }),
        prisma.lead.count({
          where: { userId: user.id, detectedAt: { gte: weekAgo } },
        }),
        prisma.lead.findFirst({
          where: { userId: user.id, detectedAt: { gte: weekAgo } },
          orderBy: { detectedAt: "desc" },
          select: { interest: true },
        }),
        prisma.message.findFirst({
          where: { userId: user.id, direction: MessageDirection.INBOUND, createdAt: { gte: weekAgo } },
          orderBy: { createdAt: "desc" },
          select: { bodyText: true },
        }),
      ]);

      const topQuestion = latestLead?.interest?.trim() || latestInbound?.bodyText?.trim() || null;
      const { subject, html } = buildWeekOneSummaryEmail({
        displayName: displayNameFor(user),
        businessName: "نشاطك التجاري",
        totalReplies,
        leadsDetected: leads,
        topQuestion,
      });
      await sendEmail({ to: user.email, subject, html });
      await prisma.user.update({
        where: { id: user.id },
        data: { weekOneSummarySentAt: new Date() },
        select: { id: true },
      });
      sent += 1;
    } catch (error) {
      logger.warn("api.cron.onboarding-emails", "Week-1 summary failed for one user.", { error, userId: user.id });
    }
  }

  return { candidates: candidates.length, sent };
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return jsonError("غير مصرح.", 403);
  }

  try {
    const now = new Date();

    // Batches run sequentially to keep per-user DB pressure low on small
    // Postgres plans. Each batch stamps its own sent-at marker, so a failed
    // batch retries cleanly on the next run without duplicates.
    const welcome = await sendWelcomeEmails(now).catch((error) => {
      logger.error("api.cron.onboarding-emails", "Welcome batch failed.", { error });
      return { candidates: 0, sent: 0 };
    });
    const dayTwo = await sendDayTwoNudges(now).catch((error) => {
      logger.error("api.cron.onboarding-emails", "Day-2 batch failed.", { error });
      return { candidates: 0, sent: 0, skipped: 0 };
    });
    const weekOne = await sendWeekOneSummaries(now).catch((error) => {
      logger.error("api.cron.onboarding-emails", "Week-1 batch failed.", { error });
      return { candidates: 0, sent: 0 };
    });

    logger.info("api.cron.onboarding-emails", "Onboarding email batches processed.", { welcome, dayTwo, weekOne });

    return jsonSuccess({ welcome, dayTwo, weekOne });
  } catch (error) {
    logger.error("api.cron.onboarding-emails", "Failed to process onboarding emails.", { error });
    return jsonError("تعذر إرسال رسائل المتابعة. حاول مرة أخرى.", 500);
  }
}
