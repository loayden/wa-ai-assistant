// FILE: src/app/pricing/page.tsx
import type { Metadata } from "next";

import { PublicPricingPage } from "@/components/marketing/PublicMarketingPages";
import { detectPaymobMode } from "@/lib/paymob/mode";

export const metadata: Metadata = {
  title: "أسعار kallem",
  description: "خطط kallem بالجنيه المصري مع حدود ردود وقنوات واضحة، ودفع Paymob لا يفتح إلا عند إعداد مفاتيح الإنتاج.",
};

export default function PricingPage() {
  return <PublicPricingPage paymobMode={detectPaymobMode()} />;
}

