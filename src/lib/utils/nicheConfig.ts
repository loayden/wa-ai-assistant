// FILE: src/lib/utils/nicheConfig.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Niche defaults keep voice setup useful immediately while still
 * producing prompts with the same interpolation tokens used by reply generation.
 */
import "server-only";

import { openai } from "@/lib/openai/client";
import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";

export type Tone = "friendly" | "professional" | "sales";

export type NicheConfig = {
  niche: string;
  displayName: string;
  systemPromptTemplate: string;
  defaultTone: Tone;
  defaultFallback: string;
  exampleQuestions: string[];
};

const nicheKeys = ["doctor", "restaurant", "store", "service", "realEstate", "legal", "general"] as const;
type NicheKey = (typeof nicheKeys)[number];

export const NICHE_CONFIGS: Record<NicheKey, NicheConfig> = {
  doctor: {
    niche: "doctor",
    displayName: "طبيب أو عيادة",
    defaultTone: "professional",
    defaultFallback: "سيتواصل معك أحد أفراد فريق العيادة قريباً.",
    exampleQuestions: ["ما مواعيد العيادة؟", "هل يمكن حجز موعد؟", "هل تقبلون الحضور بدون حجز؟"],
    systemPromptTemplate:
      "You are the AI assistant for {businessName}. Help patients with appointment scheduling, clinic hours, and offered services. Do not diagnose or give treatment advice. For urgent symptoms, direct patients to call the clinic or emergency care. Reply in {language}. Keep responses under {maxReplyLength} characters.",
  },
  restaurant: {
    niche: "restaurant",
    displayName: "مطعم",
    defaultTone: "friendly",
    defaultFallback: "سيرد الفريق قريباً بالتفاصيل.",
    exampleQuestions: ["هل المطعم مفتوح اليوم؟", "هل يوجد توصيل؟", "هل يمكن حجز طاولة؟"],
    systemPromptTemplate:
      "You are the AI assistant for {businessName}. Help customers with opening hours, menu questions, delivery, reservations, and order basics. Be warm, clear, and practical. Do not invent prices or availability. Reply in {language}. Keep responses under {maxReplyLength} characters.",
  },
  store: {
    niche: "store",
    displayName: "متجر",
    defaultTone: "sales",
    defaultFallback: "سيؤكد أحد أفراد فريق المتجر هذه المعلومة قريباً.",
    exampleQuestions: ["هل هذا المنتج متوفر؟", "كم تكلفة التوصيل؟", "هل يمكن الإرجاع؟"],
    systemPromptTemplate:
      "You are the AI assistant for {businessName}. Help shoppers with product availability, delivery, returns, payment methods, and basic recommendations. Be helpful without pressuring. Do not promise stock unless provided. Reply in {language}. Keep responses under {maxReplyLength} characters.",
  },
  service: {
    niche: "service",
    displayName: "نشاط خدمات",
    defaultTone: "professional",
    defaultFallback: "سيراجع أحد أفراد الفريق طلبك ويرد قريباً.",
    exampleQuestions: ["هل يمكن حجز زيارة؟", "ما المناطق التي تغطونها؟", "كم التكلفة؟"],
    systemPromptTemplate:
      "You are the AI assistant for {businessName}. Help customers understand services, availability, service areas, estimates, and booking next steps. Ask for missing details when needed. Do not guarantee final pricing. Reply in {language}. Keep responses under {maxReplyLength} characters.",
  },
  realEstate: {
    niche: "realEstate",
    displayName: "عقارات",
    defaultTone: "sales",
    defaultFallback: "سيرد مستشار عقاري بمزيد من التفاصيل قريباً.",
    exampleQuestions: ["هل هذه الوحدة متاحة؟", "هل يمكن تحديد معاينة؟", "ما خطة الدفع؟"],
    systemPromptTemplate:
      "You are the AI assistant for {businessName}. Help leads with property availability, viewing requests, locations, payment-plan basics, and handoff to an agent. Do not invent prices or legal terms. Reply in {language}. Keep responses under {maxReplyLength} characters.",
  },
  legal: {
    niche: "legal",
    displayName: "مكتب قانوني",
    defaultTone: "professional",
    defaultFallback: "سيراجع أحد أفراد الفريق القانوني رسالتك ويرد قريباً.",
    exampleQuestions: ["هل يمكن حجز استشارة؟", "ما المستندات المطلوبة؟", "هل تتعاملون مع هذا النوع من القضايا؟"],
    systemPromptTemplate:
      "You are the AI assistant for {businessName}. Help clients with consultation booking, office hours, document preparation, and service areas. Do not provide legal advice or guarantees. For urgent legal deadlines, direct them to contact the office. Reply in {language}. Keep responses under {maxReplyLength} characters.",
  },
  general: {
    niche: "general",
    displayName: "نشاط عام",
    defaultTone: "friendly",
    defaultFallback: "سيرد أحد أفراد الفريق في أقرب وقت.",
    exampleQuestions: ["ما مواعيد العمل؟", "أين موقعكم؟", "هل يمكن أن يتواصل معي أحد؟"],
    systemPromptTemplate:
      "You are the AI assistant for {businessName}. Help customers with business hours, location, services, availability, and next steps. Be concise, friendly, and accurate. If information is missing, ask a clear follow-up or offer a human handoff. Reply in {language}. Keep responses under {maxReplyLength} characters.",
  },
};

function isNicheKey(value: string): value is NicheKey {
  return nicheKeys.includes(value as NicheKey);
}

export function getNicheConfig(niche: string): NicheConfig {
  return isNicheKey(niche) ? NICHE_CONFIGS[niche] : NICHE_CONFIGS.general;
}

export async function detectNiche(businessName: string, context = ""): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: appEnv.OPENAI_MODEL,
      temperature: 0,
      max_tokens: 20,
      messages: [
        {
          role: "user",
          content: `Classify this business into exactly one key: ${nicheKeys.join(", ")}.\nBusiness: ${businessName}\nContext: ${context}`,
        },
      ],
    });
    const detected = completion.choices[0]?.message.content?.trim() ?? "general";
    return isNicheKey(detected) ? detected : "general";
  } catch (error) {
    logger.warn("nicheConfig.detectNiche", "Niche detection failed; falling back to general.", { error });
    return "general";
  }
}

export function interpolatePrompt(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((prompt, [key, value]) => prompt.replaceAll(`{${key}}`, value), template);
}
