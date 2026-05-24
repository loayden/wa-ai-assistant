/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: WhatsApp voice transcription is isolated so webhook processing can
 * convert voice notes into normal text messages before the AI pipeline runs.
 */
import "server-only";

import { whatsappClient } from "@/lib/api/whatsapp";
import { appEnv } from "@/lib/utils/env";

export type VoiceTranscriptionResult = {
  transcript: string;
  mediaUrl: string;
  mimeType: string;
};

export async function transcribeWhatsAppAudio(params: {
  mediaId: string;
  accessToken: string;
}): Promise<VoiceTranscriptionResult> {
  const media = await whatsappClient.getMediaUrl(params.mediaId, { accessToken: params.accessToken });
  const audioResponse = await fetch(media.url, {
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
    },
  });

  if (!audioResponse.ok) {
    throw new Error(`WhatsApp media download failed with status ${audioResponse.status}.`);
  }

  const mimeType = media.mime_type || "audio/ogg";
  const audioBuffer = await audioResponse.arrayBuffer();
  const formData = new FormData();
  formData.append("file", new Blob([audioBuffer], { type: mimeType }), mimeType.includes("mpeg") ? "voice.mp3" : "voice.ogg");
  formData.append("model", "whisper-1");
  formData.append("language", "ar");

  const transcriptionResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${appEnv.OPENAI_API_KEY}`,
    },
    body: formData,
  });
  const payload = (await transcriptionResponse.json()) as { text?: string; error?: { message?: string } };

  if (!transcriptionResponse.ok || !payload.text?.trim()) {
    throw new Error(payload.error?.message || "OpenAI Whisper could not transcribe this voice message.");
  }

  return {
    transcript: payload.text.trim(),
    mediaUrl: media.url,
    mimeType,
  };
}
