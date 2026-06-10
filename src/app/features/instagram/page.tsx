import type { Metadata } from "next";

import { ChannelMarketingPage } from "@/components/marketing/PublicMarketingPages";
import { createPublicPageMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = createPublicPageMetadata({
  title: "مساعد إنستجرام وماسنجر AI",
  description: "ردود عربية ذكية لإنستجرام وماسنجر مع فحص ربط الصفحة والصلاحيات وحالة Meta App Review قبل الإطلاق العام.",
  path: "/features/instagram",
});

export default function InstagramFeaturePage() {
  return <ChannelMarketingPage pageKey="social" />;
}
