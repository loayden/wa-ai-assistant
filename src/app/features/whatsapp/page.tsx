import type { Metadata } from "next";

import { ChannelMarketingPage } from "@/components/marketing/PublicMarketingPages";
import { createPublicPageMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = createPublicPageMetadata({
  title: "مساعد رسائل واتساب وإنستجرام وماسنجر",
  description: "اربط قنوات العملاء الثلاثة مع kallem لتشغيل ردود عربية ذكية، متابعة الطلبات، وفحص جاهزية كل قناة قبل الرد على العملاء.",
  path: "/features/whatsapp",
});

export default function WhatsAppFeaturePage() {
  return <ChannelMarketingPage pageKey="whatsapp" />;
}
