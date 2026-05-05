// FILE: src/lib/utils/encryption.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: WhatsApp access tokens must be encrypted at rest; AES-256-GCM
 * provides authenticated encryption with a per-value IV and auth tag.
 */
import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

import { appEnv } from "@/lib/utils/env";

const ALGORITHM = "aes-256-gcm";
const IV_BYTE_LENGTH = 12;
const AUTH_TAG_BYTE_LENGTH = 16;
const ENCODING = "base64url";

function getEncryptionKey(): Buffer {
  return Buffer.from(appEnv.ENCRYPTION_SECRET, "utf8");
}

export function encrypt(text: string): string {
  const iv = randomBytes(IV_BYTE_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv, {
    authTagLength: AUTH_TAG_BYTE_LENGTH,
  });

  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString(ENCODING), authTag.toString(ENCODING), encrypted.toString(ENCODING)].join(".");
}

export function decrypt(encryptedText: string): string {
  const [ivValue, authTagValue, encryptedValue] = encryptedText.split(".");

  if (!ivValue || !authTagValue || !encryptedValue) {
    throw new Error("Invalid encrypted payload format.");
  }

  const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), Buffer.from(ivValue, ENCODING), {
    authTagLength: AUTH_TAG_BYTE_LENGTH,
  });

  decipher.setAuthTag(Buffer.from(authTagValue, ENCODING));

  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, ENCODING)), decipher.final()]).toString("utf8");
}
