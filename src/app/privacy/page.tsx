import type { Metadata } from "next";
import Link from "next/link";

import { AppFooter } from "@/components/shared/AppFooter";
import { BRAND_LOCKUP } from "@/lib/utils/brand";

export const metadata: Metadata = {
  title: "سياسة الخصوصية",
  description: "سياسة خصوصية kallem لاستخدام تسجيل الدخول الاجتماعي وقنوات الرسائل.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-wa-gray-50 text-wa-gray-900">
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16" dir="rtl">
        <Link href="/" className="text-body-sm font-semibold text-wa-blue-600">
          {BRAND_LOCKUP}
        </Link>
        <h1 className="mt-6 text-3xl font-semibold sm:text-4xl">سياسة الخصوصية</h1>
        <p className="mt-4 text-body-sm leading-7 text-wa-gray-600">آخر تحديث: 29 مايو 2026</p>

        <div className="mt-8 space-y-7 rounded-3xl border border-wa-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <section>
            <h2 className="text-xl font-semibold">البيانات التي نجمعها</h2>
            <p className="mt-3 leading-8 text-wa-gray-700">
              نجمع بيانات الحساب الأساسية مثل الاسم والبريد الإلكتروني وصورة الحساب عند تسجيل الدخول عبر Google أو Facebook، بالإضافة إلى بيانات القنوات التي يربطها صاحب النشاط لتشغيل صندوق الرسائل والردود.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">كيف نستخدم البيانات</h2>
            <p className="mt-3 leading-8 text-wa-gray-700">
              نستخدم البيانات لتسجيل الدخول، حفظ الجلسة، ربط قنوات الرسائل، عرض المحادثات، تشغيل الردود التلقائية بناءً على إعدادات النشاط، وحماية الحساب من الاستخدام غير المصرح به.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">مشاركة البيانات</h2>
            <p className="mt-3 leading-8 text-wa-gray-700">
              لا نبيع بيانات العملاء. قد نعالج البيانات مع مزودي الخدمة الضروريين مثل Supabase وVercel وMeta وGoogle وPaymob وموفري البريد من أجل تشغيل المنتج فقط.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">حذف البيانات</h2>
            <p className="mt-3 leading-8 text-wa-gray-700">
              يمكن لصاحب الحساب طلب حذف بياناته من خلال صفحة حذف البيانات أو التواصل معنا على البريد المسجل للدعم.
            </p>
            <Link href="/data-deletion" className="mt-3 inline-flex text-body-sm font-semibold text-wa-blue-600">
              تعليمات حذف البيانات
            </Link>
          </section>

          <section>
            <h2 className="text-xl font-semibold">التواصل</h2>
            <p className="mt-3 leading-8 text-wa-gray-700">لأي طلب متعلق بالخصوصية: kallemapp@gmail.com</p>
          </section>
        </div>
      </section>
      <AppFooter compact />
    </main>
  );
}
