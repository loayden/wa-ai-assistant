import { z } from "zod";

export const analyticsRangeSchema = z.enum(["7d", "30d"]);

export const analyticsQuerySchema = z.object({
  range: analyticsRangeSchema.default("7d"),
});

export type AnalyticsRange = z.infer<typeof analyticsRangeSchema>;
