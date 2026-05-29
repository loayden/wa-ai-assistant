import type { Metadata } from "next";
import Link from "next/link";

import { AppFooter } from "@/components/shared/AppFooter";
import { BRAND_LOCKUP } from "@/lib/utils/brand";

export const metadata: Metadata = {
  title: "حذف البيانات",
  description: "تعليمات حذف بيانات الحساب من kallem.",
};

export default function DataDeletionPage() {
  return (
    <main className="min-h-screen bg-wa-gray-50 text-wa-gray-900">
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16" dir="rtl">
        <Link href="/" className="text-body-sm font-semibold text-wa-blue-600">
          {BRAND_LOCKUP}
        </Link>
        <h1 className="mt-6 text-3xl font-semibold sm:text-4xl">تعليمات حذف البيانات</h1>
        <p className="mt-4 text-body-sm leading-7 text-wa-gray-600">آخر تحديث: 29 مايو 2026</p>

        <div className="mt-8 space-y-7 rounded-3xl border border-wa-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <section>
            <h2 className="text-xl font-semibold">طلب حذف الحساب</h2>
            <p className="mt-3 leading-8 text-wa-gray-700">
              لحذف بيانات حسابك، أرسل رسالة من بريد الحساب المسجل إلى kallemapp@gmail.com بعنوان: طلب حذف بيانات kallem.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">ما الذي يتم حذفه؟</h2>
            <p className="mt-3 leading-8 text-wa-gray-700">
              نحذف بيانات الحساب، إعدادات النشاط، القنوات المرتبطة، المحادثات، العملاء المحتملين، وسجلات التشغيل المرتبطة بالحساب، ما لم تكن هناك التزامات قانونية أو محاسبية تتطلب الاحتفاظ بجزء محدود من البيانات.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">مدة التنفيذ</h2>
            <p className="mt-3 leading-8 text-wa-gray-700">نراجع طلبات الحذف وننفذها خلال مدة معقولة بعد تأكيد ملكية البريد.</p>
          </section>
        </div>
      </section>
      <AppFooter compact />
    </main>
  );
}
