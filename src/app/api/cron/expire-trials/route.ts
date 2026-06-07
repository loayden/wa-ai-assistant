import { NextResponse } from "next/server";

import { getExpiredTrialDowngradeData, buildExpiredTrialWhere } from "@/lib/admin/trials";
import { prisma } from "@/lib/prisma/client";
import { isAuthorizedCronRequest } from "@/lib/security/cron";
import { sendSupportEmail } from "@/lib/support/email";
import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ success: false, error: "Forbidden." }, { status: 403 });
  }

  const expiredTrials = await prisma.user.findMany({
    where: buildExpiredTrialWhere(),
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  });

  for (const user of expiredTrials) {
    await prisma.user.update({
      where: { id: user.id },
      data: getExpiredTrialDowngradeData(),
      select: { id: true },
    });

    await sendSupportEmail({
      to: user.email,
      subject: "انتهت تجربة Pro المجانية",
      html: `<div dir="rtl" style="font-family:Arial,sans-serif">
        <p>أهلاً ${user.fullName ?? user.email}، انتهت تجربة Pro المجانية.</p>
        <p>تم تحويل الحساب إلى الخطة المجانية. يمكنك الرجوع إلى Pro في أي وقت من صفحة الفوترة.</p>
        <p><a href="${appEnv.NEXT_PUBLIC_APP_URL}/billing">ترقية الخطة</a></p>
      </div>`,
    });
  }

  logger.info("cron.expire-trials", "Expired unpaid trials processed.", {
    count: expiredTrials.length,
  });

  return NextResponse.json({ success: true, expired: expiredTrials.length });
}
