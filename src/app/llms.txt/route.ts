import { getAbsoluteUrl } from "@/lib/marketing/seo";
import { BRAND_LOCKUP } from "@/lib/utils/brand";

export const dynamic = "force-static";

const publicPages = [
  ["Home", "/"],
  ["Pricing", "/pricing"],
  ["Security", "/security"],
  ["AI messaging", "/features/ai"],
  ["Unified inbox", "/features/inbox"],
  ["Instagram automation", "/features/instagram"],
  ["WhatsApp automation", "/features/whatsapp"],
  ["Respond.io comparison", "/compare/respond-io"],
  ["WhatChimp comparison", "/compare/whatchimp"],
  ["Privacy policy", "/privacy"],
  ["Terms", "/terms"],
] as const;

function buildLlmsTxt() {
  const pageList = publicPages.map(([label, path]) => `- ${label}: ${getAbsoluteUrl(path)}`).join("\n");

  return `# ${BRAND_LOCKUP}

> Arabic-first AI customer messaging SaaS for WhatsApp, Instagram, and Facebook Messenger.

Kallem helps small and medium businesses manage customer conversations from one dashboard, train an AI assistant on business knowledge, detect leads, organize products and orders, and hand off conversations to a human when needed.

## Core capabilities

- Unified inbox for WhatsApp, Instagram, and Facebook Messenger.
- AI auto-replies grounded in business knowledge, FAQs, products, policies, and conversation context.
- Manual handoff so owners can pause automation and reply personally.
- Knowledge base, products, orders, lead tracking, templates, broadcasts, billing, support, and readiness checks.
- Arabic-first RTL interface for businesses that sell through social messaging.

## Public documentation and marketing pages

${pageList}

## Protected areas

Authenticated dashboards, messages, customer data, billing settings, admin tools, and API routes are private product surfaces and should not be crawled or summarized as public documentation.
`;
}

export function GET() {
  return new Response(buildLlmsTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
