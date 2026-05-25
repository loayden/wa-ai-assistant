export type MessagingChannel = "whatsapp" | "instagram" | "messenger";

export type NormalizedMessageType = "text" | "image" | "audio" | "video" | "sticker" | "unknown";

export interface NormalizedInboundMessage {
  externalMessageId: string;
  externalThreadId: string;
  senderName?: string;
  senderProfilePicUrl?: string;
  channel: MessagingChannel;
  text?: string;
  messageType: NormalizedMessageType;
  rawPayload: unknown;
  timestamp: number;
  pageId?: string;
  instagramAccountId?: string;
}

export interface ChannelSendResult {
  externalMessageId?: string;
  success: boolean;
  error?: string;
}

export interface ChannelAdapter {
  channel: MessagingChannel;
  sendText(params: {
    connectionId: string;
    recipientId: string;
    text: string;
    accessToken: string;
    pageId?: string;
    phoneNumberId?: string;
  }): Promise<ChannelSendResult>;
  normalizeWebhookEvent(entry: unknown): NormalizedInboundMessage[];
}
