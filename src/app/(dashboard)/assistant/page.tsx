import Link from "next/link";

import { GeneralSettings } from "@/components/settings/GeneralSettings";

export default function AssistantPage() {
  return (
    <main className="kallem-workspace-page">
      <header className="mb-4 rounded-[22px] border border-wa-gray-100 bg-white p-4 shadow-[0_18px_56px_rgba(13,20,33,0.05)] sm:mb-5 sm:rounded-[28px] sm:p-8">
        <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">المساعد الذكي</p>
        <h1 className="mt-2 text-[30px] font-semibold leading-tight text-wa-gray-900 sm:text-[46px]">شخصية المساعد وطريقة رده</h1>
        <p className="mt-3 max-w-[680px] text-body-sm leading-6 text-wa-gray-600 sm:text-body-lg">
          حددي نبرة الرد واللغة ووصف النشاط والتعليمات المخصصة وساعات العمل. لاختبار الردود على بياناتك الحقيقية،
          استخدمي صندوق الاختبار في صفحة <Link className="font-semibold text-wa-blue-700 hover:underline" href="/knowledge">المعرفة</Link>.
        </p>
      </header>
      <GeneralSettings />
    </main>
  );
}
