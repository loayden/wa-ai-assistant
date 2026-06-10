export const marketingEventNames = [
  "page_view",
  "cta_click",
  "pricing_plan_click",
  "blog_article_click",
  "public_nav_click",
  "signup_success",
  "social_auth_start",
] as const;

export type MarketingEventName = (typeof marketingEventNames)[number];

export type MarketingEventPayload = {
  eventName: MarketingEventName;
  clientId: string;
  path: string;
  label?: string;
  target?: string;
  source?: string;
  referrer?: string;
  viewport?: string;
  landingPage?: string;
  firstReferrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  gclid?: string;
  fbclid?: string;
};
