// FILE: src/lib/validators/knowledge.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Knowledge entries are intentionally simple text records so the
 * assistant can consume them from every reply path without schema churn.
 */
import { z } from "zod";

import { KNOWLEDGE_CONTENT_MAX_LENGTH, KNOWLEDGE_TITLE_MAX_LENGTH } from "@/lib/knowledge/constants";

export const knowledgeTypeSchema = z.enum(["text", "faq", "hours"]);

export const createKnowledgeEntrySchema = z
  .object({
    type: knowledgeTypeSchema,
    title: z.string().trim().min(1).max(KNOWLEDGE_TITLE_MAX_LENGTH),
    content: z.string().trim().min(1).max(KNOWLEDGE_CONTENT_MAX_LENGTH),
  })
  .strict();

export const updateKnowledgeEntrySchema = z
  .object({
    title: z.string().trim().min(1).max(KNOWLEDGE_TITLE_MAX_LENGTH).optional(),
    content: z.string().trim().min(1).max(KNOWLEDGE_CONTENT_MAX_LENGTH).optional(),
  })
  .strict()
  .refine((value) => value.title !== undefined || value.content !== undefined, {
    message: "At least one field is required.",
  });

export const assistantTestSchema = z
  .object({
    message: z.string().trim().min(1).max(1_000),
  })
  .strict();

export type CreateKnowledgeEntryInput = z.infer<typeof createKnowledgeEntrySchema>;
export type UpdateKnowledgeEntryInput = z.infer<typeof updateKnowledgeEntrySchema>;
