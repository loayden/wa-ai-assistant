import Link from "next/link";
import { AlertTriangle, Building2, CheckCircle2, MessageSquareText, Sparkles, WalletCards } from "lucide-react";

import { getAdminBusinesses, getAdminOverview } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

function formatNumber(value: number) {
  return value.toLocaleString("ar-EG");
}

function KpiCard({
  href,
  icon,
  label,
  tone = "blue",
  value,
}: {
  href?: string;
  icon: React.ReactNode;
  label: string;
  tone?: "blue" | "green" | "amber" | "red";
  value: string;
}) {
  const toneClass =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700"
        : tone === "red"
          ? "bg-red-50 text-red-700"
          : "bg-wa-blue-50 text-wa-blue-700";
  const content = (
    <div className="rounded-[24px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.035)] sm:p-5">
      <span className={`flex size-11 items-center justify-center rounded-2xl ${toneClass}`}>{icon}</span>
      <p className="mt-4 text-label font-semibold uppercase tracking-widest text-wa-gray-500">{label}</p>
      <p className="mt-2 text-[28px] font-semibold leading-none text-wa-gray-900">{value}</p>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

export default async function AdminOverviewPage() {
  const [overview, recentBusinesses] = await Promise.all([
    getAdminOverview(),
    getAdminBusinesses({ filter: "all", page: 1, limit: 10 }),
  ]);
  const totalPlans = Math.max(1, overview.free_count + overview.pro_count + overview.business_count);
  const freePct = Math.round((overview.free_count / totalPlans) * 100);
  const proPct = Math.round((overview.pro_count / totalPlans) * 100);
  const paidTotal = Math.max(1, overview.total_paid);
  const churnRiskPct = Math.round((overview.churn_risk / paidTotal) * 100);
  const activeWeekPct = Math.round((overview.active_this_week / Math.max(1, overview.total_businesses)) * 100);

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-wa-gray-100 bg-white p-5 shadow-[0_18px_56px_rgba(13,20,33,0.05)] sm:p-7">
        <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">إدارة كَلّم</p>
        <div className="mt-3 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h1 className="text-[32px] font-semibold leading-tight text-wa-gray-900 sm:text-[48px]">مركز التحكم</h1>
            <p className="mt-3 max-w-[720px] text-body-sm leading-6 text-wa-gray-600 sm:text-body">
              متابعة الإيرادات، العملاء، الاستخدام، الدعم، وصحة المنتج من مكان واحد خاص بالإدارة.
            </p>
          </div>
          <Link href="/admin/tickets" className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-wa-blue-600 px-5 text-body-sm font-semibold text-white hover:bg-[#1447E6]">
            فتح طلبات الدعم
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard href="/admin/revenue" icon={<WalletCards className="size-5" />} label="الإيراد الشهري" value={`${formatNumber(overview.mrr_egp)} جنيه`} />
        <KpiCard href="/admin/businesses" icon={<Building2 className="size-5" />} label="الأنشطة" value={formatNumber(overview.total_businesses)} />
        <KpiCard href="/admin/businesses?filter=paid" icon={<CheckCircle2 className="size-5" />} label="حسابات مدفوعة" tone="green" value={formatNumber(overview.total_paid)} />
        <KpiCard icon={<Sparkles className="size-5" />} label="تسجيلات اليوم" tone="green" value={formatNumber(overview.new_signups_today)} />
        <KpiCard icon={<MessageSquareText className="size-5" />} label="رسائل اليوم" value={formatNumber(overview.total_messages_today)} />
        <KpiCard href="/admin/businesses?filter=churn_risk" icon={<AlertTriangle className="size-5" />} label="خطر التوقف" tone="red" value={formatNumber(overview.churn_risk)} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.58fr_0.42fr]">
        <div className="rounded-[28px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.035)] sm:p-6">
          <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">صحة النمو</p>
          <h2 className="mt-2 text-[24px] font-semibold text-wa-gray-900">نشاط المستخدمين خلال الأسبوع</h2>
          <p className="mt-2 text-body-sm leading-6 text-wa-gray-600">
            هذه اللوحة تساعدك تعرف هل المستخدمون وصلوا لقيمة حقيقية أم سجلوا فقط ثم توقفوا.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-4">
              <p className="text-body-sm text-wa-gray-500">نشط هذا الأسبوع</p>
              <p className="mt-2 text-2xl font-semibold text-wa-gray-900">{formatNumber(overview.active_this_week)}</p>
            </div>
            <div className="rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-4">
              <p className="text-body-sm text-wa-gray-500">رسائل الشهر</p>
              <p className="mt-2 text-2xl font-semibold text-wa-gray-900">{formatNumber(overview.total_messages_this_month)}</p>
            </div>
            <div className="rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-4">
              <p className="text-body-sm text-wa-gray-500">تسجيلات الأسبوع</p>
              <p className="mt-2 text-2xl font-semibold text-wa-gray-900">{formatNumber(overview.new_signups_this_week)}</p>
            </div>
          </div>
          <div className="mt-5">
            <div className="flex justify-between gap-4 text-body-sm">
              <span className="font-semibold text-wa-gray-900">نسبة النشاط من إجمالي الحسابات</span>
              <span className="text-wa-gray-500">{formatNumber(activeWeekPct)}%</span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-wa-gray-100">
              <div className="h-full rounded-full bg-wa-blue-600" style={{ width: `${Math.min(100, activeWeekPct)}%` }} />
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-red-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.035)] sm:p-6">
          <p className="text-label font-semibold uppercase tracking-widest text-red-600">Churn Watch</p>
          <h2 className="mt-2 text-[24px] font-semibold text-wa-gray-900">حسابات مدفوعة تحتاج متابعة</h2>
          <p className="mt-2 text-body-sm leading-6 text-wa-gray-600">
            أي حساب مدفوع بلا رسائل خلال ١٤ يومًا يظهر هنا كخطر توقف حتى يتواصل معه الفريق قبل خسارته.
          </p>
          <div className="mt-6 flex items-center justify-center">
            <div
              className="grid size-40 place-items-center rounded-full"
              style={{ background: `conic-gradient(#DC2626 0% ${churnRiskPct}%, #FEE2E2 ${churnRiskPct}% 100%)` }}
              aria-label="نسبة الحسابات المدفوعة المعرضة للتوقف"
            >
              <div className="grid size-28 place-items-center rounded-full bg-white text-center">
                <strong className="text-3xl text-wa-gray-900">{formatNumber(churnRiskPct)}%</strong>
                <span className="text-xs text-wa-gray-500">من المدفوع</span>
              </div>
            </div>
          </div>
          <Link href="/admin/businesses?filter=churn_risk" className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-red-600 px-5 text-body-sm font-semibold text-white hover:bg-red-700">
            فتح الحسابات المعرضة للتوقف
          </Link>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.68fr_0.32fr]">
        <div className="rounded-[28px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.035)] sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">أحدث التسجيلات</p>
              <h2 className="mt-2 text-[24px] font-semibold text-wa-gray-900">آخر الأنشطة التجارية</h2>
            </div>
            <Link href="/admin/businesses" className="text-body-sm font-semibold text-wa-blue-600 hover:underline">
              عرض الكل
            </Link>
          </div>
          <div className="mt-5 overflow-hidden rounded-2xl border border-wa-gray-100">
            {recentBusinesses.businesses.map((business) => (
              <Link
                key={business.id}
                href={`/admin/businesses/${business.id}`}
                className="grid gap-2 border-b border-wa-gray-100 px-4 py-3 last:border-b-0 hover:bg-wa-gray-50 sm:grid-cols-[1fr_auto_auto] sm:items-center"
              >
                <div>
                  <p className="font-semibold text-wa-gray-900">{business.name}</p>
                  <p className="text-body-sm text-wa-gray-500">{business.email}</p>
                </div>
                <span className="rounded-full bg-wa-gray-50 px-3 py-1 text-body-sm font-semibold text-wa-gray-700">{business.plan}</span>
                <span className="text-body-sm text-wa-gray-500">{formatNumber(business.messages_7d)} رسالة / ٧ أيام</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.035)] sm:p-6">
          <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">توزيع الخطط</p>
          <h2 className="mt-2 text-[24px] font-semibold text-wa-gray-900">نسبة الاشتراكات</h2>
          <div
            className="mx-auto mt-6 size-36 rounded-full"
            style={{
              background: `conic-gradient(#9CA3AF 0% ${freePct}%, #2563EB ${freePct}% ${freePct + proPct}%, #0A2540 ${freePct + proPct}% 100%)`,
            }}
            aria-label="توزيع الخطط"
          />
          <div className="mt-6 space-y-3 text-body-sm">
            <div className="flex justify-between"><span className="text-wa-gray-500">مجاني</span><strong>{formatNumber(overview.free_count)}</strong></div>
            <div className="flex justify-between"><span className="text-wa-gray-500">برو</span><strong>{formatNumber(overview.pro_count)}</strong></div>
            <div className="flex justify-between"><span className="text-wa-gray-500">الأعمال</span><strong>{formatNumber(overview.business_count)}</strong></div>
          </div>
        </div>
      </section>
    </div>
  );
}
