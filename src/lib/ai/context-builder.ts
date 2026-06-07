import "server-only";

import type { MessageDirection, UserSettings } from "@prisma/client";

import { isWithinWorkingHours } from "@/lib/assistant/working-hours";
import type { MessagingChannel } from "@/lib/channels/types";
import { prisma } from "@/lib/prisma/client";

export type AIContextSourceType =
  | "business_profile"
  | "working_hours"
  | "knowledge"
  | "product"
  | "correction"
  | "conversation_history"
  | "customer_profile";

export type AIContextSource = {
  id: string;
  type: AIContextSourceType;
  title: string;
  excerpt: string;
};

export type AIContextProduct = {
  id: string;
  name: string;
  nameEn: string | null;
  price: number;
  category: string | null;
  description: string | null;
};

export type AIContextBundle = {
  userId: string;
  businessName: string;
  language: string;
  maxReplyLength: number;
  outsideWorkingHours: boolean;
  hasGroundingContext: boolean;
  sources: AIContextSource[];
  products: AIContextProduct[];
  promptSections: {
    sourceRegistry: string;
    businessContext: string;
    workingHoursBlock: string;
    knowledgeBlock: string;
    catalogBlock: string;
    correctionsBlock: string;
    customerProfileBlock: string;
    conversationHistoryBlock: string;
  };
};

export type BuildAIContextBundleParams = {
  settings: UserSettings;
  userMessage: string;
  channel?: MessagingChannel;
  connectionId?: string;
  customerId?: string;
};

const MAX_SOURCE_EXCERPT_LENGTH = 260;
const MAX_CONVERSATION_MESSAGES = 6;

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function truncate(value: string, maxLength = MAX_SOURCE_EXCERPT_LENGTH) {
  const compacted = compactWhitespace(value);

  if (compacted.length <= maxLength) {
    return compacted;
  }

  return `${compacted.slice(0, maxLength - 3).trim()}...`;
}

function formatPriceEGP(pricePiastres: number) {
  return `${(pricePiastres / 100).toFixed(0)} EGP`;
}

function buildWorkingHoursText(settings: UserSettings) {
  if (!settings.workingHoursEnabled) {
    return "";
  }

  return [
    `Working hours enabled.`,
    `Days: ${settings.workingDays.join(", ") || "not configured"}.`,
    `Hours: ${settings.workingHoursStart} - ${settings.workingHoursEnd}.`,
    `Timezone: ${settings.timezone}.`,
  ].join(" ");
}

function sourceLine(source: AIContextSource) {
  return `- ${source.id} (${source.type}): ${source.title} - ${source.excerpt}`;
}

function directionLabel(direction: MessageDirection) {
  return direction === "INBOUND" ? "Customer" : "Business";
}

export async function buildAIContextBundle(params: BuildAIContextBundleParams): Promise<AIContextBundle> {
  const userId = params.settings.userId;
  const customerId = params.customerId?.trim();

  const [knowledgeEntries, products, corrections, recentMessages, customerProfile] = await Promise.all([
    prisma.knowledgeBaseEntry.findMany({
      where: { userId },
      select: {
        id: true,
        type: true,
        title: true,
        content: true,
      },
      orderBy: [{ type: "asc" }, { updatedAt: "desc" }],
      take: 80,
    }),
    prisma.product.findMany({
      where: {
        userId,
        isAvailable: true,
      },
      select: {
        id: true,
        name: true,
        nameEn: true,
        description: true,
        price: true,
        category: true,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      take: 100,
    }),
    prisma.aiCorrection.findMany({
      where: { userId },
      select: {
        id: true,
        originalCustomerMessage: true,
        wrongAiReply: true,
        correctReply: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    params.connectionId && customerId
      ? prisma.message.findMany({
          where: {
            userId,
            connectionId: params.connectionId,
            OR: [{ fromNumber: customerId }, { toNumber: customerId }, { externalThreadId: customerId }],
          },
          select: {
            direction: true,
            bodyText: true,
            aiReplyText: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: MAX_CONVERSATION_MESSAGES,
        })
      : Promise.resolve([]),
    customerId
      ? prisma.customerProfile.findUnique({
          where: {
            userId_phone: {
              userId,
              phone: customerId,
            },
          },
          select: {
            name: true,
            notes: true,
            tags: true,
            commonTopics: true,
            totalOrders: true,
            totalSpentPiastres: true,
            dominantMood: true,
          },
        })
      : Promise.resolve(null),
  ]);

  const sources: AIContextSource[] = [];
  const businessContext = params.settings.businessContext?.trim() ?? "";

  if (businessContext) {
    sources.push({
      id: "business_profile",
      type: "business_profile",
      title: params.settings.businessName?.trim() || "Business profile",
      excerpt: truncate(businessContext),
    });
  }

  const workingHoursText = buildWorkingHoursText(params.settings);

  if (workingHoursText) {
    sources.push({
      id: "working_hours",
      type: "working_hours",
      title: "Working hours",
      excerpt: truncate(workingHoursText),
    });
  }

  for (const entry of knowledgeEntries) {
    const label = entry.type === "faq" ? "FAQ" : entry.type === "hours" ? "Working hours" : "Business info";
    sources.push({
      id: `knowledge:${entry.id}`,
      type: "knowledge",
      title: `${label}: ${entry.title}`,
      excerpt: truncate(entry.content),
    });
  }

  for (const product of products) {
    sources.push({
      id: `product:${product.id}`,
      type: "product",
      title: product.name,
      excerpt: truncate(`${product.name}${product.nameEn ? ` / ${product.nameEn}` : ""}: ${formatPriceEGP(product.price)}${product.description ? ` - ${product.description}` : ""}`),
    });
  }

  for (const correction of corrections) {
    sources.push({
      id: `correction:${correction.id}`,
      type: "correction",
      title: `Correction: ${truncate(correction.originalCustomerMessage, 80)}`,
      excerpt: truncate(correction.correctReply),
    });
  }

  const customerProfileText = customerProfile
    ? [
        customerProfile.name ? `Name: ${customerProfile.name}` : "",
        customerProfile.notes ? `Notes: ${customerProfile.notes}` : "",
        customerProfile.tags.length ? `Tags: ${customerProfile.tags.join(", ")}` : "",
        customerProfile.commonTopics.length ? `Common topics: ${customerProfile.commonTopics.join(", ")}` : "",
        `Orders: ${customerProfile.totalOrders}`,
        `Spent: ${formatPriceEGP(customerProfile.totalSpentPiastres)}`,
        `Mood: ${customerProfile.dominantMood}`,
      ]
        .filter(Boolean)
        .join(". ")
    : "";

  if (customerProfileText) {
    sources.push({
      id: "customer_profile",
      type: "customer_profile",
      title: "Customer profile",
      excerpt: truncate(customerProfileText),
    });
  }

  const chronologicalMessages = [...recentMessages].reverse();
  const conversationHistoryText = chronologicalMessages
    .map((message) => {
      const text = message.aiReplyText || message.bodyText;
      return `${directionLabel(message.direction)}: ${truncate(text, 180)}`;
    })
    .join("\n");

  if (conversationHistoryText) {
    sources.push({
      id: "conversation_history",
      type: "conversation_history",
      title: "Recent conversation",
      excerpt: truncate(conversationHistoryText),
    });
  }

  const sourceRegistry = sources.length
    ? ["Available source ids. Use only these ids in the JSON sources field:", ...sources.map(sourceLine)].join("\n")
    : "No business data sources are available yet.";

  const knowledgeBlock = knowledgeEntries.length
    ? [
        "Business Knowledge:",
        ...knowledgeEntries.map((entry) => {
          const label = entry.type === "faq" ? "FAQ" : entry.type === "hours" ? "Working hours" : "Business info";
          return `[${label}: ${entry.title}]\nSource id: knowledge:${entry.id}\n${entry.content.trim()}`;
        }),
        "Use this business knowledge when answering. Do not invent details that are not provided.",
      ].join("\n\n")
    : "";

  const catalogBlock = products.length
    ? [
        "Available product catalog:",
        ...products.map((product) => {
          const englishName = product.nameEn ? ` / ${product.nameEn}` : "";
          const category = product.category ? ` (${product.category})` : "";
          const description = product.description ? ` - ${product.description}` : "";
          return `- [Source id: product:${product.id}] ${product.name}${englishName}${category}: ${formatPriceEGP(product.price)}${description}`;
        }),
        "",
        "Order handling rule:",
        "If the customer clearly wants to order available products, reply with a short order summary, total, and ask for delivery address if needed.",
        'At the very end of replyText, add this hidden machine-readable line exactly: [[ORDER: { "items": [{ "name": "Product name", "qty": 1, "unit_price": 10000 }], "subtotal": 10000 }]]',
        "Use integer piastres for unit_price and subtotal. Do not add the ORDER line unless there is a clear order intent.",
      ].join("\n")
    : "";

  const correctionsBlock = corrections.length
    ? [
        "Business-specific correction examples. Learn from these and do not repeat the wrong replies:",
        ...corrections.map(
          (correction) =>
            `[Source id: correction:${correction.id}]\nCustomer: "${correction.originalCustomerMessage}"\nWrong reply: "${correction.wrongAiReply}"\nCorrect reply: "${correction.correctReply}"`,
        ),
      ].join("\n\n")
    : "";

  const workingHoursBlock = workingHoursText ? `Working hours:\nSource id: working_hours\n${workingHoursText}` : "";
  const customerProfileBlock = customerProfileText ? `Customer profile:\nSource id: customer_profile\n${customerProfileText}` : "";
  const conversationHistoryBlock = conversationHistoryText
    ? `Recent conversation history:\nSource id: conversation_history\n${conversationHistoryText}`
    : "";

  return {
    userId,
    businessName: params.settings.businessName?.trim() || "your business",
    language: params.settings.language,
    maxReplyLength: params.settings.maxReplyLength,
    outsideWorkingHours: params.settings.workingHoursEnabled ? !isWithinWorkingHours(params.settings) : false,
    hasGroundingContext: sources.some((source) =>
      ["business_profile", "working_hours", "knowledge", "product", "customer_profile"].includes(source.type),
    ),
    sources,
    products,
    promptSections: {
      sourceRegistry,
      businessContext,
      workingHoursBlock,
      knowledgeBlock,
      catalogBlock,
      correctionsBlock,
      customerProfileBlock,
      conversationHistoryBlock,
    },
  };
}

