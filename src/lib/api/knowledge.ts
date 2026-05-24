// FILE: src/lib/api/knowledge.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Knowledge serialization and prompt formatting live in one place so
 * routes, tests, and the AI client share the same business context contract.
 */
import "server-only";

import type { KnowledgeBaseEntry } from "@prisma/client";

import type { KnowledgeEntryResponse, KnowledgeType } from "@/types/api";

export type KnowledgePromptEntry = Pick<KnowledgeBaseEntry, "type" | "title" | "content">;

export function serializeKnowledgeEntry(entry: KnowledgeBaseEntry): KnowledgeEntryResponse {
  return {
    id: entry.id,
    userId: entry.userId,
    type: entry.type as KnowledgeType,
    title: entry.title,
    content: entry.content,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

export function buildKnowledgeBlock(entries: KnowledgePromptEntry[]): string {
  if (entries.length === 0) {
    return "";
  }

  const formattedEntries = entries
    .map((entry) => {
      const label = entry.type === "faq" ? "FAQ" : entry.type === "hours" ? "Working hours" : "Business info";
      return `[${label}: ${entry.title}]\n${entry.content.trim()}`;
    })
    .join("\n\n");

  return `\n\nBusiness Knowledge:\n${formattedEntries}\n\nUse this business knowledge when answering. Do not invent details that are not provided. If the answer is missing, say that a team member will follow up.`;
}
