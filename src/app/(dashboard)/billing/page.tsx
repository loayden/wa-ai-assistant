// FILE: src/app/(dashboard)/billing/page.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Billing renders as a subscription control page, with Paymob-hosted
 * checkout delegated to the billing API.
 */
import { BillingPageClient } from "@/components/billing/BillingPageClient";
import { ensureAppUser } from "@/lib/api/auth";
import { detectPaymobMode } from "@/lib/paymob/mode";
import { getUser } from "@/lib/supabase/server";

export default async function BillingPage() {
  const user = await getUser();
  const appUser = user ? await ensureAppUser(user) : null;

  return (
    <div className="kallem-workspace-page space-y-4">
      <section className="workspace-hero overflow-hidden rounded-[22px] border border-wa-gray-100 bg-white shadow-[0_18px_56px_rgba(13,20,33,0.05)] sm:rounded-[32px]">
        <div className="grid gap-4 p-4 sm:gap-5 sm:p-8 lg:grid-cols-[1fr_0.58fr] lg:items-end">
          <div>
            <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">الفوترة</p>
            <h1 className="mt-2 max-w-[680px] text-[28px] font-semibold leading-tight text-wa-gray-900 sm:mt-3 sm:text-[54px] sm:leading-[1.06]">
              اختاري حجم الردود المناسب لنشاطك.
            </h1>
            <p className="mt-3 max-w-[680px] text-body-sm leading-6 text-wa-gray-600 sm:mt-5 sm:text-body-lg">
              الخطط مبنية على عدد ردود الذكاء الاصطناعي وأرقام واتساب المتصلة. بيانات الدفع تبقى داخل Paymob.
            </p>
          </div>
          <div className="rounded-[20px] border border-wa-blue-100 bg-wa-blue-50 p-4 sm:rounded-[26px] sm:p-5">
            <p className="text-body-sm font-semibold text-wa-blue-600">حدود شهرية واضحة</p>
            <p className="mt-2 text-body-sm leading-6 text-wa-gray-700">
              الخطة المجانية تشمل 50 رد. Pro تشمل 2,000 رد. Business تشمل 10,000 رد. الخطط المدفوعة تتابع الاستخدام بوضوح بعد الحد المتاح.
            </p>
          </div>
        </div>
      </section>
      <BillingPageClient isAdmin={Boolean(appUser?.isAdmin)} paymobMode={detectPaymobMode()} />
    </div>
  );
}
