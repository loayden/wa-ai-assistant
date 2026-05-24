/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: A shared footer keeps public, auth, and protected pages connected
 * to the same product map without repeating large footer markup per route.
 */
import Link from "next/link";
import { CheckCircle2, CreditCard } from "lucide-react";

import { BRAND_NAME, BRAND_NAME_AR } from "@/lib/utils/brand";
import { cn } from "@/lib/utils";

const footerSections = [
  {
    title: "المنتج",
    links: [
      { label: "لوحة التحكم", href: "/dashboard" },
      { label: "إعداد واتساب", href: "/whatsapp" },
      { label: "الرسائل", href: "/messages" },
      { label: "الفوترة", href: "/billing" },
    ],
  },
  {
    title: "الحساب",
    links: [
      { label: "إنشاء حساب", href: "/signup" },
      { label: "تسجيل الدخول", href: "/login" },
      { label: "الأسعار", href: "/#pricing" },
      { label: "طريقة الإعداد", href: "/#setup" },
    ],
  },
  {
    title: "الثقة",
    links: [
      { label: "اتصال موثّق", href: "/whatsapp" },
      { label: "تخزين مشفر", href: "/#setup" },
      { label: "إيقاف الذكاء في أي وقت", href: "/dashboard" },
      { label: "دفع عبر Paymob", href: "/billing" },
    ],
  },
];

const trustNotes = [
  "إعداد واتساب اليدوي واضح ويتم التحقق منه قبل الحفظ.",
  "صاحب النشاط يقدر يوقف ردود الذكاء الاصطناعي في أي وقت.",
  "الخطط تعرض حدود الردود الشهرية بدون غموض.",
];

export function AppFooter({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <footer className={cn("border-t border-wa-gray-100 bg-white", className)}>
      <div className={cn("mx-auto max-w-[1120px] px-3 sm:px-6", compact ? "py-6 sm:py-8" : "py-8 sm:py-12 lg:py-14")}>
        <div className="grid gap-6 sm:gap-8 lg:grid-cols-[1fr_1.45fr]">
          <div>
            <Link href="/" className="inline-flex items-baseline gap-2 text-xl font-semibold text-wa-gray-900 sm:text-2xl" aria-label="الرئيسية">
              <span>{BRAND_NAME}</span>
              <span lang="ar" dir="rtl" className="text-wa-blue-600">
                {BRAND_NAME_AR}
              </span>
            </Link>
            <p className="mt-3 max-w-[440px] text-body-sm leading-6 text-wa-gray-600 sm:mt-4">
              مساعد واتساب ذكي للأعمال الصغيرة. اربط رقمك، فعّل الردود التلقائية، راجع المحادثات، وتابع الفوترة من مكان واحد.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 sm:mt-5 sm:gap-3">
              <Link
                href="/whatsapp"
                className="inline-flex min-h-10 items-center justify-center rounded-full bg-wa-blue-600 px-4 text-body-sm font-semibold text-white shadow-[0_16px_42px_rgba(26,86,255,0.16)] transition hover:bg-[#1447E6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wa-blue-600 sm:min-h-11 sm:px-5"
              >
                افتح الإعداد
              </Link>
              <Link
                href="/billing"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-wa-gray-200 bg-white px-4 text-body-sm font-semibold text-wa-gray-700 transition hover:bg-wa-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wa-blue-600 sm:min-h-11 sm:px-5"
              >
                <CreditCard className="size-4" aria-hidden="true" />
                عرض الفوترة
              </Link>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-3 sm:gap-7">
            {footerSections.map((section) => (
              <div key={section.title}>
                <h2 className="text-body-sm font-semibold text-wa-gray-900">{section.title}</h2>
                <ul className="mt-3 space-y-2.5 sm:mt-4 sm:space-y-3">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-body-sm leading-6 text-wa-gray-600 transition hover:text-wa-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wa-blue-600"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {!compact ? (
          <div className="mt-6 grid gap-3 border-y border-wa-gray-100 py-4 sm:mt-8 sm:py-5 md:grid-cols-3">
            {trustNotes.map((note) => (
              <div key={note} className="flex items-start gap-3 rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-4">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-wa-blue-600" aria-hidden="true" />
                <p className="text-body-sm leading-6 text-wa-gray-700">{note}</p>
              </div>
            ))}
          </div>
        ) : null}

        <div className={cn("flex flex-col gap-3 text-body-sm text-wa-gray-500 md:flex-row md:items-center md:justify-between", compact ? "mt-6" : "mt-6")}>
          <span>© 2026 {BRAND_NAME}. جميع الحقوق محفوظة.</span>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-wa-gray-100 bg-white px-3 py-1.5 text-xs font-semibold text-wa-gray-600">50 رد مجاني</span>
            <span className="rounded-full border border-wa-gray-100 bg-white px-3 py-1.5 text-xs font-semibold text-wa-gray-600">Pro 999 جنيه/شهر</span>
            <span className="rounded-full border border-wa-gray-100 bg-white px-3 py-1.5 text-xs font-semibold text-wa-gray-600">Business 2,499 جنيه/شهر</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
