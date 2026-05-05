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

export type SafeWhatsAppConnection = Omit<WhatsAppConnection, "accessToken"> & {
  accessTokenMasked: string;
};

export const whatsappClient = appEnv.WHATSAPP_MOCK_MODE ? mockWhatsAppClient : realWhatsAppClient;

export function sanitizeConnection(connection: WhatsAppConnection): SafeWhatsAppConnection {
  const { accessToken: _accessToken, ...safeConnection } = connection;
  void _accessToken;

  return {
    ...safeConnection,
    accessTokenMasked: "********",
  };
}
