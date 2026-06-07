import type { Metadata } from "next";

import { FeatureMarketingPage } from "@/components/marketing/PublicMarketingPages";

export const metadata: Metadata = {
  title: "مساعد AI يرد من بيانات نشاطك",
  description: "مساعد kallem يستخدم معلومات النشاط، المنتجات، المعرفة، التصحيحات، وساعات العمل قبل الرد على العملاء.",
};

export default function AiFeaturePage() {
  return <FeatureMarketingPage pageKey="ai" />;
}
