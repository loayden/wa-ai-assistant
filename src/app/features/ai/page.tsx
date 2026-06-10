import type { Metadata } from "next";

import { FeatureMarketingPage } from "@/components/marketing/PublicMarketingPages";
import { createPublicPageMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = createPublicPageMetadata({
  title: "مساعد AI يرد من بيانات نشاطك",
  description: "مساعد kallem يستخدم معلومات النشاط، المنتجات، المعرفة، التصحيحات، وساعات العمل قبل الرد على العملاء.",
  path: "/features/ai",
});

export default function AiFeaturePage() {
  return <FeatureMarketingPage pageKey="ai" />;
}
