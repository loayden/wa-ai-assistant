import type { Metadata } from "next";

import { ComparisonMarketingPage } from "@/components/marketing/PublicMarketingPages";

export const metadata: Metadata = {
  title: "مقارنة kallem مع respond.io",
  description: "مقارنة عملية بين kallem وrespond.io للأعمال العربية الصغيرة التي تريد واتساب وإنستجرام وماسنجر بدون تعقيد Enterprise.",
};

export default function CompareRespondIoPage() {
  return <ComparisonMarketingPage pageKey="respondio" />;
}
