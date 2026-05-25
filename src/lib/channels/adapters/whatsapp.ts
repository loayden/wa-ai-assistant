import type { ChannelAdapter } from "@/lib/channels/types";
import { whatsappClient } from "@/lib/api/whatsapp";
import { appEnv } from "@/lib/utils/env";

export const whatsappAdapter: ChannelAdapter = {
  channel: "whatsapp",

  async sendText({ accessToken, phoneNumberId, recipientId, text }) {
    if (!phoneNumberId) {
      return {
        success: false,
        error: "Missing WhatsApp phone number id.",
      };
    }

    const result = await whatsappClient.sendMessage(phoneNumberId, recipientId, text, {
      accessToken: appEnv.WHATSAPP_MOCK_MODE ? undefined : accessToken,
    });

    return {
      success: true,
      externalMessageId: result.messages[0]?.id,
    };
  },

  normalizeWebhookEvent() {
    return [];
  },
};
