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
    title: z
      .string()
      .trim()
      .min(1, "السؤال أو العنوان مطلوب.")
      .max(KNOWLEDGE_TITLE_MAX_LENGTH, `العنوان طويل جدًا. الحد الأقصى ${KNOWLEDGE_TITLE_MAX_LENGTH} حرف.`),
    content: z
      .string()
      .trim()
      .min(1, "الإجابة أو المحتوى مطلوب.")
      .max(KNOWLEDGE_CONTENT_MAX_LENGTH, `المحتوى طويل جدًا. الحد الأقصى ${KNOWLEDGE_CONTENT_MAX_LENGTH} حرف.`),
  })
  .strict();

export const updateKnowledgeEntrySchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "السؤال أو العنوان مطلوب.")
      .max(KNOWLEDGE_TITLE_MAX_LENGTH, `العنوان طويل جدًا. الحد الأقصى ${KNOWLEDGE_TITLE_MAX_LENGTH} حرف.`)
      .optional(),
    content: z
      .string()
      .trim()
      .min(1, "الإجابة أو المحتوى مطلوب.")
      .max(KNOWLEDGE_CONTENT_MAX_LENGTH, `المحتوى طويل جدًا. الحد الأقصى ${KNOWLEDGE_CONTENT_MAX_LENGTH} حرف.`)
      .optional(),
  })
  .strict()
  .refine((value) => value.title !== undefined || value.content !== undefined, {
    message: "أرسل حقلاً واحدًا على الأقل للتحديث.",
  });

export const assistantTestSchema = z
  .object({
    message: z.string().trim().min(1, "اكتب سؤالاً تجريبياً.").max(1_000, "السؤال طويل جدًا. الحد الأقصى 1000 حرف."),
  })
  .strict();

export type CreateKnowledgeEntryInput = z.infer<typeof createKnowledgeEntrySchema>;
export type UpdateKnowledgeEntryInput = z.infer<typeof updateKnowledgeEntrySchema>;
