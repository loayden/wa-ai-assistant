import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminBusinessTools } from "@/components/admin/AdminBusinessTools";
import { getAdminBusinessDetail } from "@/lib/admin/queries";

function formatDate(value: string | null) {
  if (!value) return "غير متاح";
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatPlan(plan: string) {
  if (plan === "FREE") return "مجاني";
  if (plan === "PRO") return "Pro";
  if (plan === "BUSINESS") return "Business";
  return plan;
}

function formatDirection(direction: string) {
  if (direction === "inbound") return "وارد";
  if (direction === "outbound") return "صادر";
  return direction;
}

export default async function AdminBusinessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getAdminBusinessDetail(id);

  if (!detail) {
    notFound();
  }

  const maxMessages = Math.max(1, ...detail.weekly_messages.map((item) => item.count));

  return (
    <div className="space-y-5">
      <Link href="/admin/businesses" className="text-body-sm font-semibold text-wa-blue-600 hover:underline">
        العودة إلى العملاء
      </Link>

      <section className="rounded-[28px] border border-wa-gray-100 bg-white p-5 shadow-[0_18px_56px_rgba(13,20,33,0.05)] sm:p-7">
        <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">تفاصيل النشاط</p>
        <div className="mt-3 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h1 className="text-[32px] font-semibold leading-tight text-wa-gray-900 sm:text-[44px]">{detail.business.name}</h1>
            <p className="mt-2 text-body-sm text-wa-gray-500">{detail.business.email}</p>
          </div>
          <span className="w-fit rounded-full bg-wa-blue-50 px-4 py-2 text-body-sm font-semibold text-wa-blue-700">{formatPlan(detail.business.plan)}</span>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard label="الاستخدام" value={`${detail.business.replies_used.toLocaleString("ar-EG")} / ${detail.business.replies_limit.toLocaleString("ar-EG")}`} />
        <InfoCard label="الأرقام" value={detail.channels.length.toLocaleString("ar-EG")} />
        <InfoCard label="المعرفة" value={detail.knowledge_entries.toLocaleString("ar-EG")} />
        <InfoCard label="العملاء المحتملون" value={detail.leads_total.toLocaleString("ar-EG")} />
      </section>

      <AdminBusinessTools businessId={detail.business.id} currentPlan={detail.business.plan as "FREE" | "PRO" | "BUSINESS"} />

      <section className="grid gap-4 lg:grid-cols-[0.58fr_0.42fr]">
        <div className="rounded-[28px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.035)] sm:p-6">
          <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">النشاط</p>
          <h2 className="mt-2 text-[24px] font-semibold text-wa-gray-900">الرسائل خلال ١٤ يوم</h2>
          <div className="mt-6 flex h-44 items-end gap-2">
            {detail.weekly_messages.map((item) => (
              <div key={item.date} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full items-end rounded-t-xl bg-wa-gray-50" style={{ height: "150px" }}>
                  <div className="w-full rounded-t-xl bg-wa-blue-600" style={{ height: `${Math.max(4, (item.count / maxMessages) * 150)}px` }} />
                </div>
                <span className="text-[10px] text-wa-gray-400">{item.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.035)] sm:p-6">
          <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">الحساب</p>
          <div className="mt-4 space-y-3 text-body-sm">
            <Row label="تاريخ الإنشاء" value={formatDate(detail.business.created_at)} />
            <Row label="الإعداد مكتمل" value={detail.business.onboarding_completed ? "نعم" : "لا"} />
            <Row label="نهاية التجربة" value={formatDate(detail.business.trial_ends_at)} />
            <Row label="آخر دفع" value={formatDate(detail.business.paid_at)} />
            <Row label="الطلبات" value={detail.orders_total.toLocaleString("ar-EG")} />
            <Row label="التصحيحات" value={detail.corrections_count.toLocaleString("ar-EG")} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[28px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.035)] sm:p-6">
          <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">الأرقام المتصلة</p>
          <div className="mt-4 space-y-3">
            {detail.channels.length ? detail.channels.map((channel) => (
              <div key={channel.id} className="rounded-2xl border border-wa-gray-100 p-4">
                <p className="font-semibold text-wa-gray-900">{channel.display_name ?? channel.owner_phone_number ?? "رقم واتساب"}</p>
                <p className="mt-1 text-body-sm text-wa-gray-500">معرّف الرقم: {channel.phone_number_id}</p>
                <p className="mt-1 text-body-sm text-wa-gray-500">حساب واتساب: {channel.business_account_id}</p>
                <div className="mt-3 flex gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${channel.is_active ? "bg-emerald-50 text-emerald-700" : "bg-wa-gray-50 text-wa-gray-500"}`}>{channel.is_active ? "نشط" : "متوقف"}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${channel.is_verified ? "bg-wa-blue-50 text-wa-blue-700" : "bg-amber-50 text-amber-700"}`}>{channel.is_verified ? "موثق" : "يحتاج مراجعة"}</span>
                </div>
              </div>
            )) : <p className="text-body-sm text-wa-gray-500">لا توجد أرقام متصلة.</p>}
          </div>
        </div>

        <div className="rounded-[28px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.035)] sm:p-6">
          <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">آخر المحادثات</p>
          <div className="mt-4 space-y-3">
            {detail.recent_conversations.length ? detail.recent_conversations.map((message) => (
              <div key={message.id} className="rounded-2xl border border-wa-gray-100 p-4">
                <div className="flex justify-between gap-3">
                  <p className="font-semibold text-wa-gray-900">{formatDirection(message.direction)}</p>
                  <span className="text-body-sm text-wa-gray-500">{formatDate(message.created_at)}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-body-sm leading-6 text-wa-gray-600">{message.preview}</p>
              </div>
            )) : <p className="text-body-sm text-wa-gray-500">لا توجد رسائل حديثة.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.035)] sm:p-5">
      <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-500">{label}</p>
      <p className="mt-2 text-[28px] font-semibold text-wa-gray-900">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-wa-gray-100 pb-2 last:border-b-0">
      <span className="text-wa-gray-500">{label}</span>
      <strong className="text-right text-wa-gray-900">{value}</strong>
    </div>
  );
}
