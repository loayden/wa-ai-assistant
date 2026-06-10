// FILE: src/app/security/page.tsx
import type { Metadata } from "next";

import { SecurityTrustPage } from "@/components/marketing/PublicMarketingPages";
import { createPublicPageMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = createPublicPageMetadata({
  title: "الأمان والثقة في kallem",
  description: "كيف يحمي kallem القنوات والتوكنات والدفع، ويعرض جاهزية واتساب وإنستجرام وماسنجر بوضوح قبل استقبال العملاء الحقيقيين.",
  path: "/security",
});

export default function SecurityPage() {
  return <SecurityTrustPage />;
}
