import type { Metadata } from "next";

import { ChannelMarketingPage } from "@/components/marketing/PublicMarketingPages";

export const metadata: Metadata = {
  title: "مساعد رسائل واتساب وإنستجرام وماسنجر",
  description: "اربط قنوات العملاء الثلاثة مع kallem لتشغيل ردود عربية ذكية، متابعة الطلبات، وفحص جاهزية كل قناة قبل الرد على العملاء.",
};

export default function WhatsAppFeaturePage() {
  return <ChannelMarketingPage pageKey="whatsapp" />;
}
