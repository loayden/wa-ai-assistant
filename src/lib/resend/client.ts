// FILE: src/lib/resend/client.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Email delivery is wrapped behind one helper so Stripe webhook and
 * account notifications share sender validation and error logging.
 */
import "server-only";

import { Resend } from "resend";

import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";

export type SendEmailParams = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

export const resend = new Resend(appEnv.RESEND_API_KEY);

export async function sendEmail(params: SendEmailParams) {
  const { data, error } = await resend.emails.send({
    from: appEnv.RESEND_FROM_EMAIL,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  });

  if (error) {
    logger.error("resend.sendEmail", "Failed to send transactional email.", { error, subject: params.subject });
    throw new Error(error.message);
  }

  logger.info("resend.sendEmail", "Transactional email queued.", {
    emailId: data?.id,
    subject: params.subject,
  });

  return data;
}
