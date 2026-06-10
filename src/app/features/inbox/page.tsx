import type { Metadata } from "next";

import { FeatureMarketingPage } from "@/components/marketing/PublicMarketingPages";
import { createPublicPageMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = createPublicPageMetadata({
  title: "صندوق رسائل موحد لوضوح الردود",
  description: "صندوق kallem يجمع واتساب وإنستجرام وماسنجر ويعرض حالة الرد التلقائي، التسليم، وأسباب الفشل بالعربية.",
  path: "/features/inbox",
});

export default function InboxFeaturePage() {
  return <FeatureMarketingPage pageKey="inbox" />;
}
