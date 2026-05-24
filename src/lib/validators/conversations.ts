import { z } from "zod";

export const conversationParamsSchema = z.object({
  id: z.string().uuid(),
});

export const manualConversationReplySchema = z
  .object({
    message: z.string().trim().min(1).max(4096),
  })
  .strict();
