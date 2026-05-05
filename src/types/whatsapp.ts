// FILE: src/types/whatsapp.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: WhatsApp webhook and Cloud API response types mirror Meta payload
 * structure while allowing forward-compatible optional fields.
 */
export type WhatsAppMessageType =
  | "text"
  | "image"
  | "audio"
  | "video"
  | "document"
  | "sticker"
  | "location"
  | "contacts"
  | "button"
  | "interactive"
  | "order"
  | "reaction"
  | "system";

export type WhatsAppWebhookError = {
  code: number;
  title: string;
  message?: string;
  href?: string;
  error_data?: {
    details?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type WhatsAppMessageContext = {
  from?: string;
  id?: string;
  forwarded?: boolean;
  frequently_forwarded?: boolean;
  [key: string]: unknown;
};

export type WhatsAppMediaPayload = {
  id: string;
  mime_type?: string;
  sha256?: string;
  caption?: string;
  filename?: string;
  [key: string]: unknown;
};

export type WhatsAppBaseMessage = {
  from: string;
  id: string;
  timestamp: string;
  context?: WhatsAppMessageContext;
  errors?: WhatsAppWebhookError[];
};

export type WhatsAppTextMessage = WhatsAppBaseMessage & {
  type: "text";
  text: {
    body: string;
    [key: string]: unknown;
  };
};

export type WhatsAppMediaMessage = WhatsAppBaseMessage &
  (
    | { type: "image"; image: WhatsAppMediaPayload }
    | { type: "audio"; audio: WhatsAppMediaPayload }
    | { type: "video"; video: WhatsAppMediaPayload }
    | { type: "document"; document: WhatsAppMediaPayload }
    | { type: "sticker"; sticker: WhatsAppMediaPayload }
  );

export type WhatsAppLocationMessage = WhatsAppBaseMessage & {
  type: "location";
  location: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
    [key: string]: unknown;
  };
};

export type WhatsAppContactsMessage = WhatsAppBaseMessage & {
  type: "contacts";
  contacts: Array<Record<string, unknown>>;
};

export type WhatsAppButtonMessage = WhatsAppBaseMessage & {
  type: "button";
  button: {
    text: string;
    payload: string;
    [key: string]: unknown;
  };
};

export type WhatsAppInteractiveMessage = WhatsAppBaseMessage & {
  type: "interactive";
  interactive: {
    type: string;
    button_reply?: {
      id: string;
      title: string;
      [key: string]: unknown;
    };
    list_reply?: {
      id: string;
      title: string;
      description?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
};

export type WhatsAppOrderMessage = WhatsAppBaseMessage & {
  type: "order";
  order: {
    catalog_id: string;
    product_items: Array<Record<string, unknown>>;
    text?: string;
    [key: string]: unknown;
  };
};

export type WhatsAppReactionMessage = WhatsAppBaseMessage & {
  type: "reaction";
  reaction: {
    message_id: string;
    emoji?: string;
    [key: string]: unknown;
  };
};

export type WhatsAppSystemMessage = WhatsAppBaseMessage & {
  type: "system";
  system: Record<string, unknown>;
};

export type WhatsAppMessage =
  | WhatsAppTextMessage
  | WhatsAppMediaMessage
  | WhatsAppLocationMessage
  | WhatsAppContactsMessage
  | WhatsAppButtonMessage
  | WhatsAppInteractiveMessage
  | WhatsAppOrderMessage
  | WhatsAppReactionMessage
  | WhatsAppSystemMessage;

export type WhatsAppContact = {
  profile: {
    name: string;
    [key: string]: unknown;
  };
  wa_id: string;
  [key: string]: unknown;
};

export type WhatsAppStatus = {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
  errors?: WhatsAppWebhookError[];
  conversation?: Record<string, unknown>;
  pricing?: Record<string, unknown>;
  [key: string]: unknown;
};

export type WhatsAppWebhookMetadata = {
  display_phone_number: string;
  phone_number_id: string;
};

export type WhatsAppWebhookValue = {
  messaging_product: "whatsapp";
  metadata: WhatsAppWebhookMetadata;
  contacts?: WhatsAppContact[];
  messages?: WhatsAppMessage[];
  statuses?: WhatsAppStatus[];
  errors?: WhatsAppWebhookError[];
};

export type WhatsAppWebhookPayload = {
  object: "whatsapp_business_account";
  entry: Array<{
    id: string;
    changes: Array<{
      field: "messages";
      value: WhatsAppWebhookValue;
    }>;
  }>;
};

export type WhatsAppSendMessageResponse = {
  messaging_product: "whatsapp";
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
};

export type WhatsAppMediaUrlResponse = {
  messaging_product?: "whatsapp";
  url: string;
  mime_type?: string;
  sha256?: string;
  file_size?: number;
  id?: string;
};

export type WhatsAppUnknownPayload = Record<string, unknown>;
