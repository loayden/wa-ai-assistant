import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

import { appEnv } from "@/lib/utils/env";

export function verifyMetaSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) {
    return false;
  }

  const expected = `sha256=${createHmac("sha256", appEnv.WHATSAPP_APP_SECRET).update(rawBody).digest("hex")}`;
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}
