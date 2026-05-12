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
    displayName: "Doctor or clinic",
    defaultTone: "professional",
    defaultFallback: "A clinic team member will follow up with you shortly.",
    exampleQuestions: ["What are your clinic hours?", "Can I book an appointment?", "Do you accept walk-ins?"],
    systemPromptTemplate:
      "You are the AI assistant for {businessName}. Help patients with appointment scheduling, clinic hours, and offered services. Do not diagnose or give treatment advice. For urgent symptoms, direct patients to call the clinic or emergency care. Reply in {language}. Keep responses under {maxReplyLength} characters.",
  },
  restaurant: {
    niche: "restaurant",
    displayName: "Restaurant",
    defaultTone: "friendly",
    defaultFallback: "Our team will reply soon with the details.",
    exampleQuestions: ["Are you open today?", "Do you deliver?", "Can I reserve a table?"],
    systemPromptTemplate:
      "You are the AI assistant for {businessName}. Help customers with opening hours, menu questions, delivery, reservations, and order basics. Be warm, clear, and practical. Do not invent prices or availability. Reply in {language}. Keep responses under {maxReplyLength} characters.",
  },
  store: {
    niche: "store",
    displayName: "Store",
    defaultTone: "sales",
    defaultFallback: "A store team member will confirm this for you shortly.",
    exampleQuestions: ["Is this item available?", "How much is delivery?", "Can I return it?"],
    systemPromptTemplate:
      "You are the AI assistant for {businessName}. Help shoppers with product availability, delivery, returns, payment methods, and basic recommendations. Be helpful without pressuring. Do not promise stock unless provided. Reply in {language}. Keep responses under {maxReplyLength} characters.",
  },
  service: {
    niche: "service",
    displayName: "Service business",
    defaultTone: "professional",
    defaultFallback: "A team member will review your request and reply soon.",
    exampleQuestions: ["Can I book a visit?", "What areas do you cover?", "How much does it cost?"],
    systemPromptTemplate:
      "You are the AI assistant for {businessName}. Help customers understand services, availability, service areas, estimates, and booking next steps. Ask for missing details when needed. Do not guarantee final pricing. Reply in {language}. Keep responses under {maxReplyLength} characters.",
  },
  realEstate: {
    niche: "realEstate",
    displayName: "Real estate",
    defaultTone: "sales",
    defaultFallback: "A property advisor will reply with more details shortly.",
    exampleQuestions: ["Is this unit available?", "Can I schedule a viewing?", "What is the payment plan?"],
    systemPromptTemplate:
      "You are the AI assistant for {businessName}. Help leads with property availability, viewing requests, locations, payment-plan basics, and handoff to an agent. Do not invent prices or legal terms. Reply in {language}. Keep responses under {maxReplyLength} characters.",
  },
  legal: {
    niche: "legal",
    displayName: "Legal office",
    defaultTone: "professional",
    defaultFallback: "A legal team member will review your message and reply soon.",
    exampleQuestions: ["Can I book a consultation?", "What documents should I bring?", "Do you handle this case type?"],
    systemPromptTemplate:
      "You are the AI assistant for {businessName}. Help clients with consultation booking, office hours, document preparation, and service areas. Do not provide legal advice or guarantees. For urgent legal deadlines, direct them to contact the office. Reply in {language}. Keep responses under {maxReplyLength} characters.",
  },
  general: {
    niche: "general",
    displayName: "General business",
    defaultTone: "friendly",
    defaultFallback: "A team member will reply as soon as possible.",
    exampleQuestions: ["What are your hours?", "Where are you located?", "Can someone contact me?"],
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
