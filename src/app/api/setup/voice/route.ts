// FILE: src/app/api/setup/voice/route.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Voice setup is authenticated and tenant-scoped, using Whisper for
 * transcription and GPT-4o JSON mode to turn a short recording into settings.
 */
import { z } from "zod";

import { requireAppUser, UnauthorizedError } from "@/lib/api/auth";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess, jsonValidationError } from "@/lib/api/response";
import { openai } from "@/lib/openai/client";
import { prisma } from "@/lib/prisma/client";
import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VoiceConfigSchema = z.object({
  businessType: z.enum(["doctor", "restaurant", "store", "service", "realEstate", "legal", "general"]),
  businessName: z.string().nullable(),
  tone: z.enum(["friendly", "professional", "sales"]),
  language: z.string().min(2).max(5),
  systemPrompt: z.string().max(400),
  confidence: z.number().min(0).max(1),
});

type VoiceConfig = z.infer<typeof VoiceConfigSchema>;

function getAudioFile(formData: FormData): File | null {
  const audio = formData.get("audio");
  return audio instanceof File ? audio : null;
}

async function transcribeAudio(audioFile: File): Promise<string> {
  const result = await openai.audio.transcriptions.create({
    model: "whisper-1",
    file: audioFile,
    response_format: "text",
    language: "ar",
  });

  return result;
}

async function extractVoiceConfig(transcription: string): Promise<VoiceConfig> {
  const configPrompt = `
You are a business configuration assistant.
Analyze this voice note transcription and extract business details.
Return ONLY a valid JSON object. No markdown. No explanation.
Required shape:
{
  "businessType": "one of: doctor|restaurant|store|service|realEstate|legal|general",
  "businessName": "string or null if not mentioned",
  "tone": "one of: friendly|professional|sales",
  "language": "ISO 639-1 code (ar for Arabic, en for English)",
  "systemPrompt": "A complete system prompt for an AI assistant representing this business. Max 400 characters. Written in the business's language.",
  "confidence": "number 0-1 representing detection confidence"
}
Transcription: ${JSON.stringify(transcription)}
`;
  const response = await openai.chat.completions.create({
    model: appEnv.OPENAI_MODEL,
    messages: [{ role: "user", content: configPrompt }],
    response_format: { type: "json_object" },
    max_tokens: 500,
  });
  const content = response.choices[0]?.message.content;

  if (!content) {
    throw new Error("OpenAI returned an empty configuration response.");
  }

  const parsedJson: unknown = JSON.parse(content);
  const parsed = VoiceConfigSchema.safeParse(parsedJson);

  if (!parsed.success) {
    throw parsed.error;
  }

  return parsed.data;
}

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const formData = await request.formData();
    const audioFile = getAudioFile(formData);

    if (!audioFile) {
      return jsonError("Audio file is required.", 400);
    }

    let transcription: string;

    try {
      transcription = await transcribeAudio(audioFile);
    } catch (error) {
      logger.error("api.setup.voice", "Whisper transcription failed.", { error, userId: user.id });
      return jsonError("Could not process your recording. Please try again.", 500);
    }

    const config = await extractVoiceConfig(transcription);

    await prisma.userSettings.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        systemPrompt: config.systemPrompt,
        language: config.language,
        businessName: config.businessName ?? undefined,
        autoReplyEnabled: true,
      },
      update: {
        systemPrompt: config.systemPrompt,
        language: config.language,
        businessName: config.businessName ?? undefined,
      },
    });

    return jsonSuccess({
      config,
      message: `Detected: ${config.businessType} · ${config.tone} tone`,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(error.message, 401);
    }

    if (error instanceof z.ZodError) {
      return jsonValidationError(error);
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.setup.voice", error);

    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }

    logger.error("api.setup.voice", "Voice setup failed.", { error });
    return jsonError("Could not process your recording. Please try again.", 500);
  }
}
