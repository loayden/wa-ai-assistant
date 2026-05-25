import type { ChannelAdapter, ChannelSendResult, NormalizedInboundMessage, NormalizedMessageType } from "@/lib/channels/types";
import { appEnv } from "@/lib/utils/env";

type InstagramAttachment = {
  type?: string;
};

type InstagramEvent = {
  sender?: { id?: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
    attachments?: InstagramAttachment[];
  };
};

type InstagramEntry = {
  id?: string;
  messaging?: InstagramEvent[];
};

function getMessageType(text?: string, attachments?: InstagramAttachment[]): NormalizedMessageType {
  if (text) {
    return "text";
  }

  const type = attachments?.[0]?.type;

  if (type === "image" || type === "audio" || type === "video") {
    return type;
  }

  return "unknown";
}

async function parseMetaSendResponse(res: Response): Promise<ChannelSendResult> {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return {
      success: false,
      error: typeof data === "object" ? JSON.stringify(data) : "Meta send failed",
    };
  }

  const externalMessageId =
    typeof data === "object" && data !== null && "message_id" in data && typeof data.message_id === "string"
      ? data.message_id
      : undefined;

  return {
    success: true,
    externalMessageId,
  };
}

export const instagramAdapter: ChannelAdapter = {
  channel: "instagram",

  async sendText({ accessToken, recipientId, text }) {
    if (appEnv.WHATSAPP_MOCK_MODE) {
      return {
        success: true,
        externalMessageId: `mock-instagram-${Date.now()}`,
      };
    }

    const res = await fetch(`https://graph.facebook.com/${appEnv.WHATSAPP_API_VERSION}/me/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
      }),
    });

    return parseMetaSendResponse(res);
  },

  normalizeWebhookEvent(entry: unknown): NormalizedInboundMessage[] {
    const e = entry as InstagramEntry;
    const instagramAccountId = e.id;

    if (!instagramAccountId) {
      return [];
    }

    return (e.messaging ?? []).flatMap((messaging) => {
      if (!messaging.message || messaging.message.is_echo || !messaging.sender?.id) {
        return [];
      }

      const messageType = getMessageType(messaging.message.text, messaging.message.attachments);
      const externalMessageId = messaging.message.mid ?? `${instagramAccountId}:${messaging.sender.id}:${messaging.timestamp ?? Date.now()}`;

      return [
        {
          externalMessageId,
          externalThreadId: messaging.sender.id,
          channel: "instagram",
          text: messaging.message.text,
          messageType,
          rawPayload: messaging,
          timestamp: messaging.timestamp ?? Date.now(),
          instagramAccountId,
        },
      ];
    });
  },
};
