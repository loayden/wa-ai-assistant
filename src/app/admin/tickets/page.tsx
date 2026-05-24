import Link from "next/link";

import { prisma } from "@/lib/prisma/client";

function statusClass(status: string) {
  if (status === "resolved") return "bg-emerald-50 text-emerald-700";
  if (status === "in_progress") return "bg-amber-50 text-amber-700";
  if (status === "waiting_customer") return "bg-purple-50 text-purple-700";
  if (status === "closed") return "bg-wa-gray-100 text-wa-gray-500";
  return "bg-wa-blue-50 text-wa-blue-700";
}

function statusLabel(status: string) {
  if (status === "resolved") return "تم الحل";
  if (status === "in_progress") return "جار المعالجة";
  if (status === "waiting_customer") return "بانتظار العميل";
  if (status === "closed") return "مغلقة";
  return "مفتوحة";
}

function priorityClass(priority: string) {
  if (priority === "urgent") return "bg-red-50 text-red-700";
  if (priority === "high") return "bg-amber-50 text-amber-700";
  return "bg-wa-gray-50 text-wa-gray-600";
}

function priorityLabel(priority: string) {
  if (priority === "urgent") return "عاجل";
  if (priority === "high") return "مرتفع";
  if (priority === "low") return "منخفض";
  return "عادي";
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

export default async function AdminTicketsPage() {
  const [tickets, openCount, inProgressCount, resolvedToday] = await Promise.all([
    prisma.supportTicket.findMany({
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: {
        user: { select: { id: true, email: true, fullName: true, planTier: true } },
        messages: { take: 1, orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.supportTicket.count({ where: { status: "open" } }),
    prisma.supportTicket.count({ where: { status: "in_progress" } }),
    prisma.supportTicket.count({
      where: {
        resolvedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
  ]);

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-wa-gray-100 bg-white p-5 shadow-[0_18px_56px_rgba(13,20,33,0.05)] sm:p-7">
        <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">الدعم</p>
        <h1 className="mt-2 text-[32px] font-semibold text-wa-gray-900 sm:text-[44px]">طلبات الدعم</h1>
        <p className="mt-3 max-w-[720px] text-body-sm leading-6 text-wa-gray-600">
          راجع طلبات العملاء ورد عليها من داخل كَلّم بدون أدوات خارجية.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <TicketStat label="مفتوحة" value={openCount} />
        <TicketStat label="جار المعالجة" value={inProgressCount} />
        <TicketStat label="تم حلها اليوم" value={resolvedToday} />
      </section>

      <section className="overflow-hidden rounded-[28px] border border-wa-gray-100 bg-white shadow-[0_14px_42px_rgba(13,20,33,0.035)]">
        <div className="hidden grid-cols-[0.6fr_1.4fr_1fr_0.7fr_0.8fr_1fr_auto] gap-4 border-b border-wa-gray-100 px-5 py-3 text-label font-semibold uppercase tracking-widest text-wa-gray-500 xl:grid">
          <span>رقم</span>
          <span>الموضوع</span>
          <span>النشاط</span>
          <span>الأولوية</span>
          <span>الحالة</span>
          <span>آخر رسالة</span>
          <span>الإجراء</span>
        </div>
        {tickets.length ? (
          tickets.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/admin/tickets/${ticket.id}`}
              className="grid gap-3 border-b border-wa-gray-100 px-5 py-4 last:border-b-0 hover:bg-wa-gray-50 xl:grid-cols-[0.6fr_1.4fr_1fr_0.7fr_0.8fr_1fr_auto] xl:items-center"
            >
              <span className="font-mono text-body-sm text-wa-gray-500">#{ticket.id.slice(0, 6)}</span>
              <div>
                <p className="font-semibold text-wa-gray-900">{ticket.subject}</p>
                <p className="line-clamp-1 text-body-sm text-wa-gray-500">{ticket.messages[0]?.content ?? "لا توجد رسائل"}</p>
              </div>
              <span className="text-body-sm text-wa-gray-600">{ticket.user.fullName ?? ticket.user.email}</span>
              <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${priorityClass(ticket.priority)}`}>{priorityLabel(ticket.priority)}</span>
              <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${statusClass(ticket.status)}`}>{statusLabel(ticket.status)}</span>
              <span className="text-body-sm text-wa-gray-500">{formatDate(ticket.updatedAt)}</span>
              <span className="font-semibold text-wa-blue-600">فتح</span>
            </Link>
          ))
        ) : (
          <div className="p-6 text-body-sm text-wa-gray-500">لا توجد طلبات دعم حتى الآن.</div>
        )}
      </section>
    </div>
  );
}

function TicketStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[24px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.035)] sm:p-5">
      <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-500">{label}</p>
      <p className="mt-2 text-[28px] font-semibold text-wa-gray-900">{value.toLocaleString("ar-EG")}</p>
    </div>
  );
}
