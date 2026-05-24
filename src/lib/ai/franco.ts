/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Franco-Arabic detection is rule-based and cheap; normalization is
 * best-effort so a translation failure never blocks the WhatsApp reply path.
 */
import "server-only";

import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";

const FRANCO_INDICATORS = [
  /\b(3ayez|3ayz|3aiz|2ayez|عايز|kda|keda|bs|bss|el|al|ya|ana|enta|enty|3andi|3ndi|msh|mesh|tb|tayeb|aw|mn|men|fe|fi|ba3d|baad|2bl|abl|aho|ahh|se3r|s3r|order)\b/i,
  /[2345679]/,
];

export type PreprocessMessageResult = {
  processedText: string;
  wasFranco: boolean;
};

export function isFrancoArabic(text: string): boolean {
  const compact = text.replace(/\s/g, "");

  if (!compact) {
    return false;
  }

  const latinChars = (compact.match(/[a-zA-Z]/g) || []).length;
  const latinRatio = latinChars / compact.length;

  return latinRatio > 0.35 && FRANCO_INDICATORS.some((indicator) => indicator.test(text));
}

export async function preprocessMessage(text: string): Promise<PreprocessMessageResult> {
  if (!isFrancoArabic(text)) {
    return { processedText: text, wasFranco: false };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${appEnv.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        max_tokens: 220,
        messages: [
          {
            role: "system",
            content:
              "أنت محول نصوص. المستخدم يكتب عربيزي/Franco-Arabic بلهجة مصرية. حوّل النص إلى عربي مصري مفهوم فقط، بدون شرح وبدون إضافة معلومات.",
          },
          { role: "user", content: text },
        ],
      }),
    });

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
      error?: { message?: string };
    };

    if (!response.ok) {
      logger.warn("ai.franco", "Franco normalization failed; using original text.", {
        status: response.status,
        error: payload.error?.message,
      });
      return { processedText: text, wasFranco: true };
    }

    const normalized = payload.choices?.[0]?.message?.content?.trim();

    return { processedText: normalized || text, wasFranco: true };
  } catch (error) {
    logger.warn("ai.franco", "Franco normalization threw; using original text.", { error });
    return { processedText: text, wasFranco: true };
  }
}
