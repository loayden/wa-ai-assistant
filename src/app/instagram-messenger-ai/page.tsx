// FILE: src/app/instagram-messenger-ai/page.tsx
import type { Metadata } from "next";

import { ChannelMarketingPage } from "@/components/marketing/PublicMarketingPages";

export const metadata: Metadata = {
  title: "مساعد إنستجرام وماسنجر AI",
  description: "ردود عربية ذكية لإنستجرام وماسنجر مع فحص ربط الصفحة والصلاحيات وحالة Meta App Review قبل الإطلاق العام.",
};

export default function InstagramMessengerAIPage() {
  return <ChannelMarketingPage pageKey="social" />;
}

