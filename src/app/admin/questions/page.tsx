import Link from "next/link";

import { getAdminQuestions } from "@/lib/admin/queries";

const ranges = ["7d", "30d"] as const;

export default async function AdminQuestionsPage({ searchParams }: { searchParams?: Promise<{ range?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const range = ranges.includes(resolvedSearchParams?.range as "7d" | "30d") ? (resolvedSearchParams?.range as "7d" | "30d") : "7d";
  const data = await getAdminQuestions(range);

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-wa-gray-100 bg-white p-5 shadow-[0_18px_56px_rgba(13,20,33,0.05)] sm:p-7">
        <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">ذكاء السوق</p>
        <h1 className="mt-2 text-[32px] font-semibold text-wa-gray-900 sm:text-[44px]">أكثر أسئلة العملاء تكراراً</h1>
        <p className="mt-3 max-w-[720px] text-body-sm leading-6 text-wa-gray-600">
          موضوعات مجمعة ومجهولة الهوية من رسائل العملاء الواردة عبر الحسابات.
        </p>
      </section>

      <nav className="flex gap-2 overflow-x-auto rounded-[22px] border border-wa-gray-100 bg-white p-2">
        {ranges.map((option) => (
          <Link
            key={option}
            href={`/admin/questions?range=${option}`}
            className={`whitespace-nowrap rounded-2xl px-4 py-2 text-body-sm font-semibold ${range === option ? "bg-wa-blue-600 text-white" : "text-wa-gray-600 hover:bg-wa-gray-50"}`}
          >
            {option}
          </Link>
        ))}
      </nav>

      <section className="overflow-hidden rounded-[28px] border border-wa-gray-100 bg-white shadow-[0_14px_42px_rgba(13,20,33,0.035)]">
        <div className="grid gap-4 border-b border-wa-gray-100 px-5 py-3 text-label font-semibold uppercase tracking-widest text-wa-gray-500 sm:grid-cols-[1fr_0.4fr_1.1fr_0.35fr]">
          <span>الموضوع</span>
          <span>العدد</span>
          <span>مثال</span>
          <span>%</span>
        </div>
        {data.themes.length ? (
          data.themes.map((theme) => (
            <div key={`${theme.theme}-${theme.count}`} className="grid gap-4 border-b border-wa-gray-100 px-5 py-4 last:border-b-0 sm:grid-cols-[1fr_0.4fr_1.1fr_0.35fr]">
              <p className="font-semibold text-wa-gray-900">{theme.theme}</p>
              <p className="text-wa-gray-600">{theme.count.toLocaleString("ar-EG")}</p>
              <p className="line-clamp-2 text-body-sm leading-6 text-wa-gray-600">{theme.example}</p>
              <p className="font-semibold text-wa-blue-600">{theme.percentage}%</p>
            </div>
          ))
        ) : (
          <div className="p-6 text-body-sm text-wa-gray-500">لا توجد أسئلة واردة في هذه الفترة حتى الآن.</div>
        )}
      </section>
    </div>
  );
}
