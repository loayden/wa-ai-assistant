import { z } from "zod";

import { jsonSuccess, jsonValidationError } from "@/lib/api/response";
import { marketingEventNames } from "@/lib/marketing/events";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const marketingEventSchema = z.object({
  eventName: z.enum(marketingEventNames),
  clientId: z.string().trim().min(8).max(128),
  path: z.string().trim().min(1).max(240),
  label: z.string().trim().max(120).optional(),
  target: z.string().trim().max(240).optional(),
  source: z.string().trim().max(80).optional(),
  referrer: z.string().trim().max(240).optional(),
  viewport: z.string().trim().max(40).optional(),
  landingPage: z.string().trim().max(240).optional(),
  firstReferrer: z.string().trim().max(240).optional(),
  utmSource: z.string().trim().max(160).optional(),
  utmMedium: z.string().trim().max(160).optional(),
  utmCampaign: z.string().trim().max(160).optional(),
  utmContent: z.string().trim().max(160).optional(),
  utmTerm: z.string().trim().max(160).optional(),
  gclid: z.string().trim().max(160).optional(),
  fbclid: z.string().trim().max(160).optional(),
});

function hasGoogleAnalyticsConfig() {
  return Boolean(process.env.GA_MEASUREMENT_ID && process.env.GA_API_SECRET);
}

async function forwardToGoogleAnalytics(input: z.infer<typeof marketingEventSchema>) {
  if (!hasGoogleAnalyticsConfig()) {
    return false;
  }

  const endpoint = new URL("https://www.google-analytics.com/mp/collect");
  endpoint.searchParams.set("measurement_id", process.env.GA_MEASUREMENT_ID!);
  endpoint.searchParams.set("api_secret", process.env.GA_API_SECRET!);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: input.clientId,
      events: [
        {
          name: input.eventName,
          params: {
            page_location: input.path,
            label: input.label,
            target: input.target,
            source: input.source,
            referrer: input.referrer,
            viewport: input.viewport,
            landing_page: input.landingPage,
            first_referrer: input.firstReferrer,
            utm_source: input.utmSource,
            utm_medium: input.utmMedium,
            utm_campaign: input.utmCampaign,
            utm_content: input.utmContent,
            utm_term: input.utmTerm,
            gclid: input.gclid,
            fbclid: input.fbclid,
            engagement_time_msec: 1,
          },
        },
      ],
    }),
    signal: AbortSignal.timeout(2500),
  });

  if (!response.ok) {
    throw new Error(`Google Analytics rejected marketing event with ${response.status}.`);
  }

  return true;
}

export async function POST(request: Request) {
  try {
    const parsed = marketingEventSchema.safeParse(await request.json());

    if (!parsed.success) {
      return jsonValidationError(parsed.error);
    }

    const forwarded = await forwardToGoogleAnalytics(parsed.data);

    return jsonSuccess({ accepted: true, forwarded });
  } catch (error) {
    logger.warn("api.marketing.events", "Failed to record marketing event.", { error });
    return jsonSuccess({ accepted: false, forwarded: false });
  }
}
