import { z } from "zod";

export const leadStatusSchema = z.enum(["new", "contacted", "converted", "dismissed"]);
export const leadChannelSchema = z.enum(["whatsapp", "instagram"]);

export const leadsQuerySchema = z.object({
  status: leadStatusSchema.optional(),
  channel: leadChannelSchema.optional(),
});

export const updateLeadSchema = z
  .object({
    status: leadStatusSchema,
  })
  .strict();

export const leadParamsSchema = z.object({
  id: z.string().uuid(),
});

export type LeadStatusInput = z.infer<typeof leadStatusSchema>;
export type LeadChannelInput = z.infer<typeof leadChannelSchema>;
