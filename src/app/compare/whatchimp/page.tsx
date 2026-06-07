// FILE: src/app/compare/whatchimp/page.tsx
import type { Metadata } from "next";

import { ComparisonMarketingPage } from "@/components/marketing/PublicMarketingPages";

export const metadata: Metadata = {
  title: "مقارنة kallem مع WhatChimp",
  description: "مقارنة بين kallem وWhatChimp من ناحية الوضوح، القنوات، جاهزية Meta، التسعير المحلي، وتشخيص فشل الردود.",
};

export default function CompareWhatchimpPage() {
  return <ComparisonMarketingPage pageKey="whatchimp" />;
}

