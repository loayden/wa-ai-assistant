// FILE: src/app/compare/respondio/page.tsx
import type { Metadata } from "next";

import { ComparisonMarketingPage } from "@/components/marketing/PublicMarketingPages";
import { createPublicPageMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = createPublicPageMetadata({
  title: "مقارنة kallem مع respond.io",
  description: "مقارنة عملية بين kallem وrespond.io للأعمال العربية الصغيرة التي تريد واتساب وإنستجرام وماسنجر بدون تعقيد Enterprise.",
  path: "/compare/respond-io",
});

export default function CompareRespondioPage() {
  return <ComparisonMarketingPage pageKey="respondio" />;
}
