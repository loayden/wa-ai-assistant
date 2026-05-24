// FILE: src/lib/utils/ownerCommands.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Owner commands are resolved in one utility so webhook control
 * traffic can update settings consistently without entering the AI reply path.
 */
import "server-only";

import type { PrismaClient } from "@prisma/client";

import { DEFAULT_SYSTEM_PROMPT } from "@/lib/utils/constants";
import { detectNiche, getNicheConfig, interpolatePrompt, type Tone } from "@/lib/utils/nicheConfig";

export type OwnerCommandResult = {
  action: string;
  confirmationMessage: string;
  settingsUpdate?: Partial<{
    autoReplyEnabled: boolean;
    systemPrompt: string;
  }>;
};

type SettingsSnapshot = {
  autoReplyEnabled: boolean;
  systemPrompt: string;
  businessName: string | null;
  businessContext: string | null;
  language: string;
  maxReplyLength: number;
};

const AVAILABLE_COMMANDS = "stop, resume, friendly, professional, sales, status";

const toneGuidance: Record<Tone, string> = {
  friendly: "Tone mode: friendly. Sound warm, welcoming, and human while staying concise.",
  professional: "Tone mode: professional. Sound clear, calm, and businesslike while staying concise.",
  sales: "Tone mode: sales. Sound confident, persuasive, and action-oriented without sounding pushy.",
};

function createSettingsSnapshot(settings: Partial<SettingsSnapshot> | null): SettingsSnapshot {
  return {
    autoReplyEnabled: settings?.autoReplyEnabled ?? true,
    systemPrompt: settings?.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
    businessName: settings?.businessName ?? null,
    businessContext: settings?.businessContext ?? null,
    language: settings?.language ?? "en",
    maxReplyLength: settings?.maxReplyLength ?? 300,
  };
}

function inferToneFromPrompt(systemPrompt: string): Tone {
  if (/tone mode:\s*sales/i.test(systemPrompt)) {
    return "sales";
  }

  if (/tone mode:\s*professional/i.test(systemPrompt)) {
    return "professional";
  }

  if (/tone mode:\s*friendly/i.test(systemPrompt)) {
    return "friendly";
  }

  if (/sales|upsell|conversion/i.test(systemPrompt)) {
    return "sales";
  }

  if (/warm|friendly|welcoming/i.test(systemPrompt)) {
    return "friendly";
  }

  return "professional";
}

async function buildTonePrompt(settings: SettingsSnapshot, tone: Tone): Promise<string> {
  const niche = await detectNiche(settings.businessName ?? "business", settings.businessContext ?? "");
  const basePrompt = getNicheConfig(niche).systemPromptTemplate;
  const prompt = interpolatePrompt(basePrompt, {
    businessName: settings.businessName?.trim() || "your business",
    language: settings.language,
    maxReplyLength: String(settings.maxReplyLength),
  });
  const withContext = settings.businessContext?.trim()
    ? `${prompt}\n\nBusiness context:\n${settings.businessContext.trim()}`
    : prompt;

  return `${withContext}\n\n${toneGuidance[tone]}`;
}

export async function handleOwnerCommand(
  command: string,
  userId: string,
  prisma: PrismaClient,
): Promise<OwnerCommandResult> {
  const normalizedCommand = command.trim().toLowerCase();
  const [user, settingsRecord] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { monthlyReplyCount: true },
    }),
    prisma.userSettings.findUnique({
      where: { userId },
      select: {
        autoReplyEnabled: true,
        systemPrompt: true,
        businessName: true,
        businessContext: true,
        language: true,
        maxReplyLength: true,
      },
    }),
  ]);

  if (!user) {
    throw new Error(`User ${userId} not found for owner command processing.`);
  }

  const settings = createSettingsSnapshot(settingsRecord);

  switch (normalizedCommand) {
    case "stop":
      return {
        action: "stop",
        confirmationMessage: "تم إيقاف المساعد. لن يرد على العملاء الآن. أرسل resume لتشغيله مرة أخرى.",
        settingsUpdate: { autoReplyEnabled: false },
      };
    case "resume":
      return {
        action: "resume",
        confirmationMessage: "تم تشغيل المساعد. سيرد على العملاء الآن.",
        settingsUpdate: { autoReplyEnabled: true },
      };
    case "friendly":
      return {
        action: "friendly",
        confirmationMessage: "تم تغيير أسلوب الرد إلى: ودود",
        settingsUpdate: { systemPrompt: await buildTonePrompt(settings, "friendly") },
      };
    case "professional":
      return {
        action: "professional",
        confirmationMessage: "تم تغيير أسلوب الرد إلى: احترافي",
        settingsUpdate: { systemPrompt: await buildTonePrompt(settings, "professional") },
      };
    case "sales":
      return {
        action: "sales",
        confirmationMessage: "تم تغيير أسلوب الرد إلى: بيعي",
        settingsUpdate: { systemPrompt: await buildTonePrompt(settings, "sales") },
      };
    case "status":
      return {
        action: "status",
        confirmationMessage:
          `الحالة:\n` +
          `• المساعد: ${settings.autoReplyEnabled ? "يعمل" : "متوقف"}\n` +
          `• الردود هذا الشهر: ${user.monthlyReplyCount.toLocaleString("ar-EG")}\n` +
          `• الأسلوب: ${inferToneFromPrompt(settings.systemPrompt) === "friendly" ? "ودود" : inferToneFromPrompt(settings.systemPrompt) === "sales" ? "بيعي" : "احترافي"}`,
      };
    default:
      return {
        action: "unknown",
        confirmationMessage: `الأمر غير معروف: '${command.trim()}'\nالأوامر المتاحة: ${AVAILABLE_COMMANDS}`,
      };
  }
}
