import { whatsappClient } from "@/lib/api/whatsapp";
import { appEnv } from "@/lib/utils/env";
import { decrypt } from "@/lib/utils/encryption";
import { sendTrackedChannelText } from "@/lib/reliability/outbox";
import { WhatsAppClientError } from "@/lib/whatsapp/client";
import { AIReplyError } from "@/lib/openai/client";
import { shouldSendNotification } from "@/lib/notifications/preferences";
import { sendConversationNotificationOnce } from "@/lib/notifications/events";

export async function sendReply(params: {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  replyText: string;
}) {
  return whatsappClient.sendMessage(params.phoneNumberId, params.to, params.replyText, {
    accessToken: appEnv.WHATSAPP_MOCK_MODE ? undefined : decrypt(params.accessToken),
  });
}

export async function sendTrackedWhatsAppReply(params: {
  connection: {
    id: string;
    userId: string;
    phoneNumberId: string;
    accessToken: string;
  };
  relatedMessageId: string;
  displayPhoneNumber: string;
  to: string;
  replyText: string;
}) {
  return sendTrackedChannelText({
    userId: params.connection.userId,
    connectionId: params.connection.id,
    relatedMessageId: params.relatedMessageId,
    channel: "whatsapp",
    direction: "auto",
    senderId: params.displayPhoneNumber,
    recipientId: params.to,
    bodyText: params.replyText,
    accessToken: appEnv.WHATSAPP_MOCK_MODE ? "" : decrypt(params.connection.accessToken),
    phoneNumberId: params.connection.phoneNumberId,
  });
}

export function describeWhatsAppSendFailure(error: unknown): string | null {
  if (!(error instanceof WhatsAppClientError)) {
    return null;
  }

  const metaCode = error.response?.error?.code;
  if (metaCode === 131030) {
    return "تم تجهيز الرد، لكن Meta منعت الإرسال لأن الرقم رقم اختباري. أضف رقم العميل كمستلم اختبار داخل Meta، أو اربط رقم WhatsApp Business إنتاجي للعملاء الحقيقيين.";
  }

  return "تم تجهيز الرد، لكن Meta رفضت إرسال رسالة واتساب. راجع الرقم المتصل وصلاحيات واتساب وهل الرقم جاهز للإنتاج.";
}

export function describeAutomaticReplyFailure(primaryError: unknown, fallbackError: unknown): string {
  const whatsappFailure = describeWhatsAppSendFailure(fallbackError) ?? describeWhatsAppSendFailure(primaryError);

  if (whatsappFailure) {
    return whatsappFailure;
  }

  if (primaryError instanceof AIReplyError) {
    if (primaryError.code === "OPENAI_RATE_LIMIT") {
      return "لم يتم إرسال الرد التلقائي لأن المساعد غير متاح مؤقتاً. حاول مرة أخرى بعد قليل أو تواصل مع الدعم.";
    }

    if (primaryError.code === "OPENAI_TIMEOUT") {
      return "لم يتم إرسال الرد التلقائي لأن المساعد تأخر في الاستجابة. حاول مرة أخرى بعد دقيقة.";
    }

    return "لم يتم إرسال الرد التلقائي لأن المساعد غير متاح الآن. تواصل مع الدعم لمراجعة الإعداد.";
  }

  return "لم يتم إرسال الرد التلقائي. راجع صلاحيات واتساب، وهل تستخدم رقم WhatsApp Business إنتاجي للعملاء الحقيقيين.";
}

export async function maybeNotifyOwner(params: {
  userId: string;
  ownerEmail: string | null | undefined;
  connectionId: string;
  customerPhone: string;
  event: "angry" | "lead" | "handoff" | "ai_failed";
  subject: string;
  html: string;
  notificationPrefs: Parameters<typeof shouldSendNotification>[0];
}) {
  if (!params.ownerEmail || !shouldSendNotification(params.notificationPrefs, params.event)) {
    return;
  }

  await sendConversationNotificationOnce({
    userId: params.userId,
    ownerEmail: params.ownerEmail,
    connectionId: params.connectionId,
    customerPhone: params.customerPhone,
    event: params.event,
    subject: params.subject,
    html: params.html,
  });
}
