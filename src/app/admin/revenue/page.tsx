import Link from "next/link";

import { getAdminRevenue, type AdminRange } from "@/lib/admin/queries";

const ranges = ["7d", "30d", "90d"] as const;

function formatEgp(value: number) {
  return `${value.toLocaleString("ar-EG")} جنيه`;
}

export default async function AdminRevenuePage({ searchParams }: { searchParams?: Promise<{ range?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const range = ranges.includes(resolvedSearchParams?.range as AdminRange) ? (resolvedSearchParams?.range as AdminRange) : "30d";
  const data = await getAdminRevenue(range);
  const totalPlans = Math.max(1, data.plan_breakdown.free + data.plan_breakdown.pro + data.plan_breakdown.business);
  const maxRevenue = Math.max(1, ...data.daily_revenue.map((item) => item.egp));

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-wa-gray-100 bg-white p-5 shadow-[0_18px_56px_rgba(13,20,33,0.05)] sm:p-7">
        <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">الإيرادات</p>
        <h1 className="mt-2 text-[32px] font-semibold text-wa-gray-900 sm:text-[44px]">اقتصاد الخطط بالجنيه</h1>
        <p className="mt-3 max-w-[720px] text-body-sm leading-6 text-wa-gray-600">
          الإيراد الشهري وتوزيع الخطط بناءً على الاشتراكات النشطة وعمليات Paymob المسجلة.
        </p>
      </section>

      <nav className="flex gap-2 overflow-x-auto rounded-[22px] border border-wa-gray-100 bg-white p-2">
        {ranges.map((option) => (
          <Link
            key={option}
            href={`/admin/revenue?range=${option}`}
            className={`whitespace-nowrap rounded-2xl px-4 py-2 text-body-sm font-semibold ${range === option ? "bg-wa-blue-600 text-white" : "text-wa-gray-600 hover:bg-wa-gray-50"}`}
          >
            {option}
          </Link>
        ))}
      </nav>

      <section className="grid gap-4 md:grid-cols-3">
        <RevenueCard label="MRR" value={formatEgp(data.mrr_egp)} />
        <RevenueCard label="ARR" value={formatEgp(data.arr_egp)} />
        <RevenueCard label="ترقيات الفترة" value={data.upgrades_this_month.toLocaleString("ar-EG")} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.65fr_0.35fr]">
        <div className="rounded-[28px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.035)] sm:p-6">
          <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">عمليات الدفع</p>
          <h2 className="mt-2 text-[24px] font-semibold text-wa-gray-900">الإيراد في الفترة المحددة</h2>
          {data.daily_revenue.length ? (
            <div className="mt-6 flex h-56 items-end gap-2">
              {data.daily_revenue.map((item) => (
                <div key={item.date} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex w-full items-end rounded-t-xl bg-wa-gray-50" style={{ height: "190px" }}>
                    <div className="w-full rounded-t-xl bg-wa-blue-600" style={{ height: `${Math.max(4, (item.egp / maxRevenue) * 190)}px` }} />
                  </div>
                  <span className="text-[10px] text-wa-gray-400">{item.date.slice(5)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-wa-gray-200 bg-wa-gray-50 p-6 text-body-sm text-wa-gray-500">
              لا توجد عمليات Paymob في هذه الفترة حتى الآن.
            </div>
          )}
        </div>

        <div className="rounded-[28px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.035)] sm:p-6">
          <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">تفصيل الخطط</p>
          <div className="mt-5 space-y-4">
            <PlanRow label="مجاني" count={data.plan_breakdown.free} pct={Math.round((data.plan_breakdown.free / totalPlans) * 100)} price="٠ جنيه" />
            <PlanRow label="Pro" count={data.plan_breakdown.pro} pct={Math.round((data.plan_breakdown.pro / totalPlans) * 100)} price="٩٩٩ جنيه" />
            <PlanRow label="Business" count={data.plan_breakdown.business} pct={Math.round((data.plan_breakdown.business / totalPlans) * 100)} price="٢٬٤٩٩ جنيه" />
          </div>
        </div>
      </section>
    </div>
  );
}

function RevenueCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.035)] sm:p-5">
      <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-500">{label}</p>
      <p className="mt-2 text-[28px] font-semibold text-wa-gray-900">{value}</p>
    </div>
  );
}

function PlanRow({ count, label, pct, price }: { count: number; label: string; pct: number; price: string }) {
  return (
    <div>
      <div className="flex justify-between gap-4 text-body-sm">
        <span className="font-semibold text-wa-gray-900">{label}</span>
        <span className="text-wa-gray-500">{count.toLocaleString("ar-EG")} × {price}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-wa-gray-100">
        <div className="h-full rounded-full bg-wa-blue-600" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
