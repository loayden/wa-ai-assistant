import Link from "next/link";

import { getAdminBusinesses } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

const filters = [
  { label: "الكل", value: "all" },
  { label: "مدفوع", value: "paid" },
  { label: "مجاني", value: "free" },
  { label: "خطر التوقف", value: "churn_risk" },
] as const;

function formatDate(value: string | null) {
  if (!value) return "لا يوجد نشاط";
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" }).format(new Date(value));
}

export default async function AdminBusinessesPage({
  searchParams,
}: {
  searchParams?: Promise<{ filter?: string; page?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const selectedFilter = filters.some((filter) => filter.value === resolvedSearchParams?.filter) ? resolvedSearchParams?.filter : "all";
  const page = Number(resolvedSearchParams?.page ?? 1);
  const data = await getAdminBusinesses({ filter: selectedFilter as "all" | "paid" | "free" | "churn_risk", page, limit: 20 });

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-wa-gray-100 bg-white p-5 shadow-[0_18px_56px_rgba(13,20,33,0.05)] sm:p-7">
        <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">الأنشطة</p>
        <h1 className="mt-2 text-[32px] font-semibold text-wa-gray-900 sm:text-[44px]">حسابات العملاء</h1>
        <p className="mt-3 max-w-[720px] text-body-sm leading-6 text-wa-gray-600">
          متابعة الخطة، الاستخدام، الإعداد، الأرقام المتصلة، واحتمال التوقف لكل عميل.
        </p>
      </section>

      <nav className="flex gap-2 overflow-x-auto rounded-[22px] border border-wa-gray-100 bg-white p-2">
        {filters.map((filter) => {
          const active = selectedFilter === filter.value;
          return (
            <Link
              key={filter.value}
              href={`/admin/businesses?filter=${filter.value}`}
              className={`whitespace-nowrap rounded-2xl px-4 py-2 text-body-sm font-semibold ${active ? "bg-wa-blue-600 text-white" : "text-wa-gray-600 hover:bg-wa-gray-50"}`}
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>

      <section className="overflow-hidden rounded-[28px] border border-wa-gray-100 bg-white shadow-[0_14px_42px_rgba(13,20,33,0.035)]">
        <div className="hidden grid-cols-[1.4fr_0.7fr_1fr_0.8fr_0.9fr_auto] gap-4 border-b border-wa-gray-100 px-5 py-3 text-label font-semibold uppercase tracking-widest text-wa-gray-500 lg:grid">
          <span>الاسم</span>
          <span>الخطة</span>
          <span>الاستخدام</span>
          <span>آخر نشاط</span>
          <span>رسائل ٧ أيام</span>
          <span>الإجراء</span>
        </div>
        {data.businesses.map((business) => {
          const highUsage = business.usage_pct >= 80;
          const churnRisk = business.plan !== "FREE" && business.messages_7d === 0;
          return (
            <Link
              key={business.id}
              href={`/admin/businesses/${business.id}`}
              className="grid gap-3 border-b border-wa-gray-100 px-5 py-4 last:border-b-0 hover:bg-wa-gray-50 lg:grid-cols-[1.4fr_0.7fr_1fr_0.8fr_0.9fr_auto] lg:items-center"
            >
              <div>
                <p className="font-semibold text-wa-gray-900">{business.name}</p>
                <p className="text-body-sm text-wa-gray-500">{business.email}</p>
              </div>
              <span className="w-fit rounded-full bg-wa-gray-50 px-3 py-1 text-body-sm font-semibold text-wa-gray-700">{business.plan}</span>
              <div>
                <div className="h-2 overflow-hidden rounded-full bg-wa-gray-100">
                  <div className={`h-full rounded-full ${highUsage ? "bg-red-500" : "bg-wa-blue-600"}`} style={{ width: `${Math.min(business.usage_pct, 100)}%` }} />
                </div>
                <p className="mt-1 text-body-sm text-wa-gray-500">{business.replies_used.toLocaleString("ar-EG")} / {business.replies_limit.toLocaleString("ar-EG")}</p>
              </div>
              <span className="text-body-sm text-wa-gray-600">{formatDate(business.last_message_at)}</span>
              <div className="flex items-center gap-2">
                <span className="text-body-sm text-wa-gray-600">{business.messages_7d.toLocaleString("ar-EG")}</span>
                {churnRisk ? <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">خطر</span> : null}
              </div>
              <span className="text-body-sm font-semibold text-wa-blue-600">فتح</span>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
