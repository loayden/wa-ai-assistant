// FILE: src/lib/whatsapp/mock.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: The mock layer matches the real WhatsApp client contracts so local
 * development and tests can exercise webhook flows without Meta credentials.
 */
import type {
  WhatsAppClientOptions,
  WhatsAppMediaUrlResponse,
  WhatsAppSendMessageResponse,
  WhatsAppTemplateComponent,
  WhatsAppTemplateListResponse,
  WhatsAppTemplateSubmissionResponse,
} from "@/lib/whatsapp/client";
import { logger } from "@/lib/utils/logger";

export type MockOutboundMessage = {
  id: string;
  phoneNumberId: string;
  to: string;
  message: string;
  createdAt: string;
};

const mockOutbound: MockOutboundMessage[] = [];

function createMockMessageId(): string {
  return `mock_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// [MOCK] — replace with real WhatsApp client in production
export async function sendMessage(
  phoneNumberId: string,
  to: string,
  message: string,
  _options?: WhatsAppClientOptions,
): Promise<WhatsAppSendMessageResponse> {
  void _options;

  const id = createMockMessageId();

  mockOutbound.push({
    id,
    phoneNumberId,
    to,
    message,
    createdAt: new Date().toISOString(),
  });

  logger.info("whatsapp.mock", "Stored mock outbound WhatsApp message.", { id, phoneNumberId, to });

  return {
    messaging_product: "whatsapp",
    contacts: [{ input: to, wa_id: to }],
    messages: [{ id }],
  };
}

// [MOCK] — replace with real WhatsApp client in production
export async function getMediaUrl(mediaId: string, _options?: WhatsAppClientOptions): Promise<WhatsAppMediaUrlResponse> {
  void _options;

  logger.info("whatsapp.mock", "Resolved mock WhatsApp media URL.", { mediaId });

  return {
    messaging_product: "whatsapp",
    id: mediaId,
    url: `mock://whatsapp-media/${mediaId}`,
  };
}

export async function submitTemplate(
  businessAccountId: string,
  payload: {
    name: string;
    language: string;
    category: string;
    components: WhatsAppTemplateComponent[];
  },
  _options?: WhatsAppClientOptions,
): Promise<WhatsAppTemplateSubmissionResponse> {
  void _options;

  logger.info("whatsapp.mock", "Stored mock WhatsApp template submission.", { businessAccountId, name: payload.name });

  return {
    id: `mock_template_${payload.name}`,
    status: "PENDING",
    category: payload.category,
  };
}

export async function listTemplates(
  _businessAccountId: string,
  _options?: WhatsAppClientOptions,
): Promise<WhatsAppTemplateListResponse> {
  void _businessAccountId;
  void _options;

  return { data: [] };
}

export async function deleteTemplate(
  businessAccountId: string,
  templateName: string,
  _options?: WhatsAppClientOptions,
): Promise<Record<string, unknown>> {
  void _options;

  logger.info("whatsapp.mock", "Deleted mock WhatsApp template.", { businessAccountId, templateName });

  return { success: true };
}

export async function sendTemplateMessage(
  phoneNumberId: string,
  to: string,
  templateName: string,
  _languageCode: string,
  parameters: string[],
  _options?: WhatsAppClientOptions,
): Promise<WhatsAppSendMessageResponse> {
  void _languageCode;

  return sendMessage(phoneNumberId, to, `Template ${templateName}: ${parameters.join(", ")}`, _options);
}

// [MOCK] — replace with real WhatsApp client in production
export function verifyWebhookSignature(
  _payload?: string | Buffer | ArrayBuffer | Uint8Array,
  _signature?: string | null,
): boolean {
  void _payload;
  void _signature;

  return true;
}

// [MOCK] — replace with real WhatsApp client in production
export function getMockOutbound(): MockOutboundMessage[] {
  return [...mockOutbound];
}
