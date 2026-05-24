import "server-only";

import { sendEmail } from "@/lib/resend/client";
import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";

export async function sendSupportEmail(params: { to?: string | null; subject: string; html: string }) {
  if (!params.to) {
    logger.warn("support.email", "Skipped support email because recipient is not configured.", {
      subject: params.subject,
    });
    return;
  }

  try {
    await sendEmail({
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
  } catch (error) {
    logger.warn("support.email", "Support email failed but request will continue.", {
      error,
      subject: params.subject,
    });
  }
}

export function getAdminEmail() {
  return appEnv.ADMIN_EMAIL;
}
