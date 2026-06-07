import type { Metadata } from "next";

import { ComparisonMarketingPage } from "@/components/marketing/PublicMarketingPages";

export const metadata: Metadata = {
  title: "مقارنة kallem مع WhatChimp",
  description: "مقارنة بين kallem وWhatChimp من ناحية الوضوح، القنوات، جاهزية Meta، التسعير المحلي، وتشخيص فشل الردود.",
};

export default function CompareWhatschimpPage() {
  return <ComparisonMarketingPage pageKey="whatchimp" />;
}
