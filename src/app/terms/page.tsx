import type { Metadata } from "next";
import Link from "next/link";

import { AppFooter } from "@/components/shared/AppFooter";
import { BRAND_LOCKUP } from "@/lib/utils/brand";

export const metadata: Metadata = {
  title: "شروط الاستخدام",
  description: "شروط استخدام kallem لإدارة رسائل السوشيال والردود التلقائية.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-wa-gray-50 text-wa-gray-900">
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16" dir="rtl">
        <Link href="/" className="text-body-sm font-semibold text-wa-blue-600">
          {BRAND_LOCKUP}
        </Link>
        <h1 className="mt-6 text-3xl font-semibold sm:text-4xl">شروط الاستخدام</h1>
        <p className="mt-4 text-body-sm leading-7 text-wa-gray-600">آخر تحديث: 29 مايو 2026</p>

        <div className="mt-8 space-y-7 rounded-3xl border border-wa-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <section>
            <h2 className="text-xl font-semibold">استخدام الخدمة</h2>
            <p className="mt-3 leading-8 text-wa-gray-700">
              kallem يساعد أصحاب الأنشطة على إدارة رسائل واتساب وإنستجرام وماسنجر وتشغيل ردود تلقائية بناءً على المعلومات التي يضيفها صاحب النشاط.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">مسؤولية صاحب الحساب</h2>
            <p className="mt-3 leading-8 text-wa-gray-700">
              صاحب الحساب مسؤول عن صحة معلومات النشاط، صلاحيات القنوات المرتبطة، والالتزام بسياسات Meta وGoogle وPaymob وأي قوانين محلية متعلقة بالتواصل مع العملاء.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">الردود التلقائية</h2>
            <p className="mt-3 leading-8 text-wa-gray-700">
              الردود التلقائية قد تحتاج مراجعة بشرية في الحالات الحساسة. يجب على صاحب النشاط متابعة صندوق الرسائل وإيقاف الذكاء عند الحاجة.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">الدفع والاشتراكات</h2>
            <p className="mt-3 leading-8 text-wa-gray-700">
              الخطط المدفوعة تخضع للأسعار والحدود المعروضة داخل التطبيق. معالجة الدفع تتم عبر مزود دفع خارجي.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">التواصل</h2>
            <p className="mt-3 leading-8 text-wa-gray-700">للاستفسارات: kallemapp@gmail.com</p>
          </section>
        </div>
      </section>
      <AppFooter compact />
    </main>
  );
}
