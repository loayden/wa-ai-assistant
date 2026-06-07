import type { Metadata } from "next";

import { ChannelMarketingPage } from "@/components/marketing/PublicMarketingPages";

export const metadata: Metadata = {
  title: "مساعد واتساب AI للأعمال الصغيرة",
  description: "اربط واتساب Business مع kallem لتشغيل ردود عربية ذكية، متابعة الطلبات، وفحص الجاهزية قبل الرد على العملاء.",
};

export default function WhatsAppFeaturePage() {
  return <ChannelMarketingPage pageKey="whatsapp" />;
}
