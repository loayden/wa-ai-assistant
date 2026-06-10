import type { Metadata } from "next";

import { ComparisonMarketingPage } from "@/components/marketing/PublicMarketingPages";
import { createPublicPageMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = createPublicPageMetadata({
  title: "مقارنة kallem مع WhatChimp",
  description: "مقارنة بين kallem وWhatChimp من ناحية الوضوح، القنوات، جاهزية Meta، التسعير المحلي، وتشخيص فشل الردود.",
  path: "/compare/whatchimp",
});

export default function CompareWhatschimpPage() {
  return <ComparisonMarketingPage pageKey="whatchimp" />;
}
