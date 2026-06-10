// FILE: src/app/whatsapp-ai/page.tsx
import type { Metadata } from "next";

import { ChannelMarketingPage } from "@/components/marketing/PublicMarketingPages";
import { createPublicPageMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = createPublicPageMetadata({
  title: "مساعد رسائل واتساب وإنستجرام وماسنجر",
  description: "اربط واتساب وإنستجرام وماسنجر مع kallem لتشغيل ردود عربية ذكية، متابعة الطلبات، وفحص جاهزية كل قناة قبل الرد على العملاء.",
  path: "/whatsapp-ai",
});

export default function WhatsAppAIPage() {
  return <ChannelMarketingPage pageKey="whatsapp" />;
}
