// FILE: src/lib/api/whatsapp.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: WhatsApp connection records contain encrypted tokens, so response
 * shaping and client selection are centralized before route handlers expose data.
 */
import "server-only";

import type { WhatsAppConnection } from "@prisma/client";

import { appEnv } from "@/lib/utils/env";
import * as realWhatsAppClient from "@/lib/whatsapp/client";
import * as mockWhatsAppClient from "@/lib/whatsapp/mock";

export type SafeWhatsAppConnection = Omit<WhatsAppConnection, "accessToken" | "ownerPhoneNumber"> & {
  accessTokenMasked: string;
  ownerPhoneNumberMasked: string | null;
};

export const whatsappClient = appEnv.WHATSAPP_MOCK_MODE ? mockWhatsAppClient : realWhatsAppClient;

function maskPhoneNumber(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const digits = value.replace(/\D/g, "");

  if (digits.length < 4) {
    return digits;
  }

  const countryPrefixLength = digits.length > 10 ? 2 : 0;
  const countryPrefix = countryPrefixLength > 0 ? `+${digits.slice(0, countryPrefixLength)} ` : "";
  return `${countryPrefix}•••• ${digits.slice(-4)}`;
}

export function sanitizeConnection(connection: WhatsAppConnection): SafeWhatsAppConnection {
  const { accessToken: _accessToken, ownerPhoneNumber: _ownerPhoneNumber, ...safeConnection } = connection;
  void _accessToken;

  return {
    ...safeConnection,
    accessTokenMasked: "********",
    ownerPhoneNumberMasked: maskPhoneNumber(_ownerPhoneNumber),
  };
}
