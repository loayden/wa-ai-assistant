// FILE: src/app/security/page.tsx
import type { Metadata } from "next";

import { SecurityTrustPage } from "@/components/marketing/PublicMarketingPages";

export const metadata: Metadata = {
  title: "الأمان والثقة في kallem",
  description: "كيف يحمي kallem القنوات والتوكنات والدفع، ويعرض جاهزية واتساب وإنستجرام وماسنجر بوضوح قبل استقبال العملاء الحقيقيين.",
};

export default function SecurityPage() {
  return <SecurityTrustPage />;
}

