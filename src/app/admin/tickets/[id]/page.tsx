import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminTicketTools } from "@/components/admin/AdminTicketTools";
import { prisma } from "@/lib/prisma/client";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

function bubbleClass(sender: string) {
  return sender === "admin" ? "bg-wa-blue-600 text-white" : "bg-white text-wa-gray-800";
}

function statusLabel(status: string) {
  if (status === "resolved") return "تم الحل";
  if (status === "in_progress") return "جار المعالجة";
  if (status === "waiting_customer") return "بانتظار العميل";
  if (status === "closed") return "مغلقة";
  return "مفتوحة";
}

function priorityLabel(priority: string) {
  if (priority === "urgent") return "عاجل";
  if (priority === "high") return "مرتفع";
  if (priority === "low") return "منخفض";
  return "عادي";
}

export default async function AdminTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          planTier: true,
          monthlyReplyCount: true,
          messages: {
            where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
            select: { id: true },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!ticket) {
    notFound();
  }

  return (
    <div className="space-y-5">
      <Link href="/admin/tickets" className="text-body-sm font-semibold text-wa-blue-600 hover:underline">
        العودة إلى طلبات الدعم
      </Link>

      <section className="rounded-[28px] border border-wa-gray-100 bg-white p-5 shadow-[0_18px_56px_rgba(13,20,33,0.05)] sm:p-7">
        <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">طلب دعم #{ticket.id.slice(0, 8)}</p>
        <h1 className="mt-2 text-[30px] font-semibold text-wa-gray-900 sm:text-[40px]">{ticket.subject}</h1>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-wa-gray-50 px-3 py-1 text-body-sm font-semibold text-wa-gray-700">{ticket.category}</span>
          <span className="rounded-full bg-wa-blue-50 px-3 py-1 text-body-sm font-semibold text-wa-blue-700">{statusLabel(ticket.status)}</span>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-body-sm font-semibold text-amber-700">{priorityLabel(ticket.priority)}</span>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <section className="rounded-[28px] border border-wa-gray-100 bg-wa-gray-50 p-4 shadow-[0_14px_42px_rgba(13,20,33,0.035)] sm:p-6">
          <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">المحادثة</p>
          <div className="mt-5 space-y-4">
            {ticket.messages.map((message) => (
              <div key={message.id} className={`flex ${message.sender === "admin" ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[84%] rounded-[22px] px-4 py-3 shadow-sm ${bubbleClass(message.sender)}`}>
                  <p className="text-xs font-semibold opacity-80">{message.sender === "admin" ? "فريق كَلّم" : ticket.user.fullName ?? ticket.user.email}</p>
                  <p className="mt-2 whitespace-pre-wrap text-body-sm leading-6">{message.content}</p>
                  <p className="mt-2 text-[11px] opacity-70">{formatDate(message.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-[24px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.035)] sm:p-5">
            <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">النشاط</p>
            <h2 className="mt-2 text-[22px] font-semibold text-wa-gray-900">{ticket.user.fullName ?? ticket.user.email}</h2>
            <div className="mt-4 space-y-3 text-body-sm">
              <Row label="الخطة" value={ticket.user.planTier} />
              <Row label="رسائل ٧ أيام" value={ticket.user.messages.length.toLocaleString("ar-EG")} />
              <Row label="ردود الشهر" value={ticket.user.monthlyReplyCount.toLocaleString("ar-EG")} />
            </div>
            <Link href={`/admin/businesses/${ticket.user.id}`} className="mt-4 inline-flex text-body-sm font-semibold text-wa-blue-600 hover:underline">
              فتح حساب النشاط
            </Link>
          </div>
          <AdminTicketTools
            ticketId={ticket.id}
            initialPriority={ticket.priority as "low" | "normal" | "high" | "urgent"}
            initialStatus={ticket.status as "open" | "in_progress" | "waiting_customer" | "resolved" | "closed"}
          />
        </aside>
      </div>
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
