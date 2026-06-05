// FILE: src/lib/whatsapp/embedded-signup.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Embedded Signup token exchange and post-onboarding Graph calls are
 * isolated from generic messaging helpers because they follow a distinct OAuth
 * flow and have different failure modes.
 */
import "server-only";

import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";

type MetaGraphErrorBody = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

type EmbeddedSignupExchangeResponse = {
  access_token: string;
  token_type?: string;
};

type WhatsAppSubscribedAppsResponse = {
  success?: boolean;
};

export type WhatsAppSubscribedApp = {
  id?: string;
  name?: string;
  subscribed_fields?: string[];
};

type WhatsAppSubscribedAppsListResponse = {
  data?: WhatsAppSubscribedApp[];
};

export type WhatsAppPhoneProfile = {
  id: string;
  display_phone_number?: string;
  verified_name?: string;
  quality_rating?: string;
  name_status?: string;
  code_verification_status?: string;
};

type WhatsAppBusinessPhoneNumbersResponse = {
  data?: WhatsAppPhoneProfile[];
};

export class EmbeddedSignupError extends Error {
  public readonly status?: number;
  public readonly response?: MetaGraphErrorBody;

  constructor(message: string, options?: { status?: number; response?: MetaGraphErrorBody }) {
    super(message);
    this.name = "EmbeddedSignupError";
    this.status = options?.status;
    this.response = options?.response;
  }
}

function buildGraphUrl(path: string): string {
  return `https://graph.facebook.com/${appEnv.WHATSAPP_API_VERSION}/${path}`;
}

async function parseMetaResponse<TResponse>(response: Response): Promise<TResponse> {
  const rawBody = await response.text();

  if (!rawBody) {
    return {} as TResponse;
  }

  try {
    return JSON.parse(rawBody) as TResponse;
  } catch (error) {
    logger.error("whatsapp.embedded-signup", "Meta returned invalid JSON during embedded signup flow.", {
      error,
      status: response.status,
      rawBody,
    });
    throw new EmbeddedSignupError("Meta returned invalid JSON.", { status: response.status });
  }
}

async function requestGraph<TResponse>(url: string, init: RequestInit): Promise<TResponse> {
  const response = await fetch(url, init);
  const payload = await parseMetaResponse<TResponse | MetaGraphErrorBody>(response);

  if (!response.ok) {
    logger.error("whatsapp.embedded-signup", "Meta embedded signup request failed.", {
      status: response.status,
      payload,
      url,
    });
    throw new EmbeddedSignupError("Meta embedded signup request failed.", {
      status: response.status,
      response: payload as MetaGraphErrorBody,
    });
  }

  return payload as TResponse;
}

export async function exchangeEmbeddedSignupCode(code: string): Promise<string> {
  const url = new URL(buildGraphUrl("oauth/access_token"));
  url.searchParams.set("client_id", appEnv.WHATSAPP_APP_ID);
  url.searchParams.set("client_secret", appEnv.WHATSAPP_APP_SECRET);
  url.searchParams.set("code", code);

  const response = await requestGraph<EmbeddedSignupExchangeResponse>(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.access_token) {
    throw new EmbeddedSignupError("Meta did not return an access token.");
  }

  return response.access_token;
}

export async function subscribeAppToBusinessAccount(businessAccountId: string, accessToken: string): Promise<void> {
  await requestGraph<WhatsAppSubscribedAppsResponse>(buildGraphUrl(`${businessAccountId}/subscribed_apps`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
}

export async function getSubscribedAppsForBusinessAccount(
  businessAccountId: string,
  accessToken: string,
): Promise<WhatsAppSubscribedApp[]> {
  const url = new URL(buildGraphUrl(`${businessAccountId}/subscribed_apps`));
  url.searchParams.set("fields", "id,name,subscribed_fields");

  const response = await requestGraph<WhatsAppSubscribedAppsListResponse>(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  return response.data ?? [];
}

export async function getPhoneProfile(phoneNumberId: string, accessToken: string): Promise<WhatsAppPhoneProfile> {
  const url = new URL(buildGraphUrl(phoneNumberId));
  url.searchParams.set(
    "fields",
    "display_phone_number,verified_name,quality_rating,name_status,code_verification_status",
  );

  return requestGraph<WhatsAppPhoneProfile>(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
}

export async function getBusinessAccountPhoneNumber(
  businessAccountId: string,
  phoneNumberId: string,
  accessToken: string,
): Promise<WhatsAppPhoneProfile | null> {
  const url = new URL(buildGraphUrl(`${businessAccountId}/phone_numbers`));
  url.searchParams.set(
    "fields",
    "display_phone_number,verified_name,quality_rating,name_status,code_verification_status",
  );

  const response = await requestGraph<WhatsAppBusinessPhoneNumbersResponse>(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  return response.data?.find((phone) => phone.id === phoneNumberId) ?? null;
}
