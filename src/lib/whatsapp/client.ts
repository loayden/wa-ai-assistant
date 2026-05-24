// FILE: src/lib/whatsapp/client.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: WhatsApp Cloud API calls are isolated behind a typed client so
 * route handlers can switch between real and mock implementations without
 * changing business logic.
 */
import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";

export type WhatsAppClientOptions = {
  accessToken?: string;
};

export type WhatsAppApiErrorBody = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
    error_data?: {
      details?: string;
      messaging_product?: string;
    };
  };
};

export type WhatsAppSendMessageResponse = {
  messaging_product: "whatsapp";
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
};

export type WhatsAppTemplateComponent =
  | { type: "HEADER"; format: "TEXT"; text: string }
  | { type: "BODY"; text: string }
  | { type: "FOOTER"; text: string }
  | { type: "BUTTONS"; buttons: Array<{ type: "URL"; text: string; url: string }> };

export type WhatsAppTemplateSubmissionResponse = {
  id?: string;
  status?: string;
  category?: string;
};

export type WhatsAppTemplateListResponse = {
  data?: Array<{
    id?: string;
    name?: string;
    status?: string;
    rejected_reason?: string;
  }>;
};

export type WhatsAppMediaUrlResponse = {
  messaging_product?: "whatsapp";
  url: string;
  mime_type?: string;
  sha256?: string;
  file_size?: number;
  id?: string;
};

export class WhatsAppClientError extends Error {
  public readonly status?: number;
  public readonly response?: WhatsAppApiErrorBody;

  constructor(message: string, options?: { status?: number; response?: WhatsAppApiErrorBody }) {
    super(message);
    this.name = "WhatsAppClientError";
    this.status = options?.status;
    this.response = options?.response;
  }
}

function buildGraphUrl(path: string): string {
  return `https://graph.facebook.com/${appEnv.WHATSAPP_API_VERSION}/${path}`;
}

function resolveAccessToken(options?: WhatsAppClientOptions): string {
  if (!options?.accessToken) {
    throw new WhatsAppClientError("WhatsApp access token is required for Meta API calls.");
  }

  return options.accessToken;
}

async function parseJsonResponse<TResponse>(response: Response): Promise<TResponse> {
  const rawBody = await response.text();

  if (!rawBody) {
    return {} as TResponse;
  }

  try {
    return JSON.parse(rawBody) as TResponse;
  } catch (error) {
    logger.error("whatsapp.client", "Meta API returned invalid JSON.", { error, rawBody });
    throw new WhatsAppClientError("Meta API returned invalid JSON.", { status: response.status });
  }
}

async function requestWhatsApp<TResponse>(
  path: string,
  init: RequestInit,
  options?: WhatsAppClientOptions,
): Promise<TResponse> {
  const accessToken = resolveAccessToken(options);
  const response = await fetch(buildGraphUrl(path), {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const parsedResponse = await parseJsonResponse<TResponse | WhatsAppApiErrorBody>(response);

  if (!response.ok) {
    logger.error("whatsapp.client", "Meta API request failed.", {
      status: response.status,
      response: parsedResponse,
    });

    throw new WhatsAppClientError("Meta API request failed.", {
      status: response.status,
      response: parsedResponse as WhatsAppApiErrorBody,
    });
  }

  return parsedResponse as TResponse;
}

export async function sendMessage(
  phoneNumberId: string,
  to: string,
  message: string,
  options?: WhatsAppClientOptions,
): Promise<WhatsAppSendMessageResponse> {
  return requestWhatsApp<WhatsAppSendMessageResponse>(
    `${phoneNumberId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: {
          preview_url: false,
          body: message,
        },
      }),
    },
    options,
  );
}

export async function submitTemplate(
  businessAccountId: string,
  payload: {
    name: string;
    language: string;
    category: string;
    components: WhatsAppTemplateComponent[];
  },
  options?: WhatsAppClientOptions,
): Promise<WhatsAppTemplateSubmissionResponse> {
  return requestWhatsApp<WhatsAppTemplateSubmissionResponse>(
    `${businessAccountId}/message_templates`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    options,
  );
}

export async function listTemplates(
  businessAccountId: string,
  options?: WhatsAppClientOptions,
): Promise<WhatsAppTemplateListResponse> {
  return requestWhatsApp<WhatsAppTemplateListResponse>(
    `${businessAccountId}/message_templates?fields=id,name,status,rejected_reason`,
    { method: "GET" },
    options,
  );
}

export async function deleteTemplate(
  businessAccountId: string,
  templateName: string,
  options?: WhatsAppClientOptions,
): Promise<Record<string, unknown>> {
  return requestWhatsApp<Record<string, unknown>>(
    `${businessAccountId}/message_templates?name=${encodeURIComponent(templateName)}`,
    { method: "DELETE" },
    options,
  );
}

export async function sendTemplateMessage(
  phoneNumberId: string,
  to: string,
  templateName: string,
  languageCode: string,
  parameters: string[],
  options?: WhatsAppClientOptions,
): Promise<WhatsAppSendMessageResponse> {
  return requestWhatsApp<WhatsAppSendMessageResponse>(
    `${phoneNumberId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: templateName,
          language: { code: languageCode },
          components:
            parameters.length > 0
              ? [
                  {
                    type: "body",
                    parameters: parameters.map((text) => ({ type: "text", text })),
                  },
                ]
              : undefined,
        },
      }),
    },
    options,
  );
}

export async function getMediaUrl(mediaId: string, options?: WhatsAppClientOptions): Promise<WhatsAppMediaUrlResponse> {
  return requestWhatsApp<WhatsAppMediaUrlResponse>(mediaId, { method: "GET" }, options);
}

function toPayloadBuffer(payload: string | Buffer | ArrayBuffer | Uint8Array): Buffer {
  if (Buffer.isBuffer(payload)) {
    return payload;
  }

  if (typeof payload === "string") {
    return Buffer.from(payload, "utf8");
  }

  if (payload instanceof ArrayBuffer) {
    return Buffer.from(new Uint8Array(payload));
  }

  return Buffer.from(payload);
}

export function verifyWebhookSignature(payload: string | Buffer | ArrayBuffer | Uint8Array, signature: string | null): boolean {
  if (!signature?.startsWith("sha256=")) {
    return false;
  }

  const expectedSignature = `sha256=${createHmac("sha256", appEnv.WHATSAPP_APP_SECRET)
    .update(toPayloadBuffer(payload))
    .digest("hex")}`;

  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const actualBuffer = Buffer.from(signature, "utf8");

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}
