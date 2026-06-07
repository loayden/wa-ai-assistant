import type { Metadata } from "next";

import { FeatureMarketingPage } from "@/components/marketing/PublicMarketingPages";

export const metadata: Metadata = {
  title: "صندوق رسائل موحد لوضوح الردود",
  description: "صندوق kallem يجمع واتساب وإنستجرام وماسنجر ويعرض حالة الرد التلقائي، التسليم، وأسباب الفشل بالعربية.",
};

export default function InboxFeaturePage() {
  return <FeatureMarketingPage pageKey="inbox" />;
}
