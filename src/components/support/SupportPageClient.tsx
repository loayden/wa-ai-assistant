"use client";

import { useEffect, useMemo, useState } from "react";
import { LifeBuoy, MessageSquare, Plus, RefreshCcw, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiData } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type TicketStatus = "open" | "in_progress" | "waiting_customer" | "resolved" | "closed";
type TicketCategory = "technical" | "billing" | "feature_request" | "other";

type TicketMessage = {
  id: string;
  sender: "customer" | "admin";
  content: string;
  createdAt: string;
};

type Ticket = {
  id: string;
  subject: string;
  category: TicketCategory;
  priority: "low" | "normal" | "high" | "urgent";
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  messages?: TicketMessage[];
  messageCount: number;
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "مفتوحة",
  in_progress: "جارٍ المعالجة",
  waiting_customer: "بانتظار ردك",
  resolved: "تم الحل",
  closed: "مغلقة",
};

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  technical: "مشكلة تقنية",
  billing: "فوترة ودفع",
  feature_request: "طلب ميزة",
  other: "أخرى",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusClass(status: TicketStatus) {
  switch (status) {
    case "resolved":
      return "bg-wa-success-bg text-wa-success";
    case "waiting_customer":
      return "bg-purple-50 text-purple-700";
    case "in_progress":
      return "bg-wa-warning-bg text-wa-warning";
    case "closed":
      return "bg-wa-gray-100 text-wa-gray-500";
    default:
      return "bg-wa-blue-50 text-wa-blue-700";
  }
}

export function SupportPageClient() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [form, setForm] = useState({
    subject: "",
    category: "technical" as TicketCategory,
    firstMessage: "",
  });

  async function loadTickets() {
    setLoading(true);
    try {
      const response = await apiData<{ tickets: Ticket[] }>("/api/tickets");
      setTickets(response.tickets);
      if (!selectedId && response.tickets[0]) {
        setSelectedId(response.tickets[0].id);
      }
    } catch (error) {
      toast.error("تعذر تحميل تذاكر الدعم", {
        description: error instanceof Error ? error.message : "حاولي مرة أخرى.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadTicket(id: string) {
    try {
      const response = await apiData<{ ticket: Ticket }>(`/api/tickets/${id}`);
      setSelectedTicket(response.ticket);
    } catch (error) {
      toast.error("تعذر فتح التذكرة", {
        description: error instanceof Error ? error.message : "حاولي مرة أخرى.",
      });
    }
  }

  useEffect(() => {
    void loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedId) {
      void loadTicket(selectedId);
    } else {
      setSelectedTicket(null);
    }
  }, [selectedId]);

  const activeTickets = useMemo(() => tickets.filter((ticket) => ticket.status !== "closed"), [tickets]);
  const selectedClosed = selectedTicket?.status === "resolved" || selectedTicket?.status === "closed";

  async function createTicket() {
    setSending(true);
    try {
      const response = await apiData<{ ticket: Ticket }>("/api/tickets", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setTickets((current) => [response.ticket, ...current]);
      setSelectedId(response.ticket.id);
      setNewTicketOpen(false);
      setForm({ subject: "", category: "technical", firstMessage: "" });
      toast.success("تم فتح تذكرة الدعم");
    } catch (error) {
      toast.error("تعذر فتح التذكرة", {
        description: error instanceof Error ? error.message : "راجعي التفاصيل ثم حاولي مرة أخرى.",
      });
    } finally {
      setSending(false);
    }
  }

  async function sendReply() {
    if (!selectedTicket || !reply.trim()) return;

    setSending(true);
    try {
      const response = await apiData<{ message: TicketMessage }>(`/api/tickets/${selectedTicket.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: reply }),
      });
      setSelectedTicket((current) =>
        current
          ? {
              ...current,
              status: "open",
              messages: [...(current.messages ?? []), response.message],
              messageCount: current.messageCount + 1,
            }
          : current,
      );
      setReply("");
      toast.success("تم إرسال الرد");
    } catch (error) {
      toast.error("تعذر إرسال الرد", {
        description: error instanceof Error ? error.message : "حاولي مرة أخرى.",
      });
    } finally {
      setSending(false);
    }
  }

  async function closeTicket() {
    if (!selectedTicket) return;

    try {
      const response = await apiData<{ ticket: Ticket }>(`/api/tickets/${selectedTicket.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "closed" }),
      });
      setSelectedTicket(response.ticket);
      setTickets((current) => current.map((ticket) => (ticket.id === response.ticket.id ? response.ticket : ticket)));
      toast.success("تم إغلاق التذكرة");
    } catch (error) {
      toast.error("تعذر إغلاق التذكرة", {
        description: error instanceof Error ? error.message : "حاولي مرة أخرى.",
      });
    }
  }

  return (
    <div className="mx-auto max-w-[1120px] px-3 pb-24 pt-4 sm:px-6 lg:pb-10 lg:pt-10">
      <header className="mb-4 overflow-hidden rounded-[22px] border border-wa-gray-100 bg-white shadow-[0_18px_56px_rgba(13,20,33,0.05)] sm:mb-5 sm:rounded-[30px]">
        <div className="grid gap-5 bg-[linear-gradient(135deg,#ffffff_0%,#f6f8ff_100%)] p-4 sm:p-8 lg:grid-cols-[1fr_280px] lg:items-end">
          <div>
            <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">الدعم</p>
            <h1 className="mt-2 text-[29px] font-semibold leading-tight text-wa-gray-900 sm:text-[48px]">الدعم الفني</h1>
            <p className="mt-3 max-w-[680px] text-body-sm leading-6 text-wa-gray-600 sm:text-body-lg" dir="rtl">
              افتح تذكرة واضحة لفريق kallem، وتابع الردود من نفس المكان بدون رسائل متفرقة.
            </p>
          </div>
          <div className="rounded-2xl border border-wa-gray-100 bg-white p-4">
            <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">التذاكر النشطة</p>
            <p className="mt-1 text-[34px] font-semibold text-wa-gray-900">{activeTickets.length}</p>
            <p className="mt-1 text-body-sm text-wa-gray-600">مفتوحة أو تنتظر إجراء.</p>
          </div>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="rounded-[22px] border border-wa-gray-100 bg-white shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px]">
          <div className="flex items-center justify-between gap-3 border-b border-wa-gray-100 p-4">
            <div>
              <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">التذاكر</p>
              <p className="mt-1 text-body-sm text-wa-gray-600">الإجمالي {tickets.length}</p>
            </div>
            <button
              type="button"
              onClick={() => setNewTicketOpen(true)}
              className="inline-flex size-11 items-center justify-center rounded-full bg-wa-blue-600 text-white transition hover:bg-wa-blue-700"
              aria-label="فتح تذكرة جديدة"
            >
              <Plus className="size-5" aria-hidden="true" />
            </button>
          </div>
          {loading ? (
            <div className="p-4 text-body-sm text-wa-gray-500">جارٍ تحميل التذاكر...</div>
          ) : tickets.length === 0 ? (
            <div className="p-5 text-center">
              <LifeBuoy className="mx-auto size-10 text-wa-blue-600" aria-hidden="true" />
              <p className="mt-3 text-body font-semibold text-wa-gray-900">لا توجد تذاكر بعد</p>
              <p className="mt-1 text-body-sm leading-6 text-wa-gray-600">لو واجهتك مشكلة، افتح تذكرة وسنرد من هنا.</p>
            </div>
          ) : (
            <div className="divide-y divide-wa-gray-100">
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(ticket.id);
                    setNewTicketOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-start gap-3 p-4 text-right transition hover:bg-wa-gray-50",
                    selectedId === ticket.id && !newTicketOpen ? "bg-wa-blue-50/70" : "bg-white",
                  )}
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-wa-gray-50 text-wa-blue-600">
                    <MessageSquare className="size-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body-sm font-semibold text-wa-gray-900">{ticket.subject}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", statusClass(ticket.status))}>
                        {STATUS_LABELS[ticket.status]}
                      </span>
                      <span className="text-xs text-wa-gray-500">{formatDate(ticket.updatedAt)}</span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className="min-h-[540px] rounded-[22px] border border-wa-gray-100 bg-white shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px]">
          {newTicketOpen ? (
            <div className="p-4 sm:p-6">
              <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">تذكرة جديدة</p>
              <h2 className="mt-2 text-h2 font-semibold text-wa-gray-900">افتح تذكرة جديدة</h2>
              <div className="mt-5 grid gap-4">
                <label className="space-y-2">
                  <span className="text-body-sm font-semibold text-wa-gray-900">الموضوع</span>
                  <Input value={form.subject} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} />
                </label>
                <label className="space-y-2">
                  <span className="text-body-sm font-semibold text-wa-gray-900">التصنيف</span>
                  <Select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as TicketCategory }))}>
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="space-y-2">
                  <span className="text-body-sm font-semibold text-wa-gray-900">الرسالة</span>
                  <Textarea value={form.firstMessage} onChange={(event) => setForm((current) => ({ ...current, firstMessage: event.target.value }))} />
                </label>
                <Button isLoading={sending} onClick={createTicket} className="rounded-full">
                  إرسال التذكرة
                </Button>
              </div>
            </div>
          ) : selectedTicket ? (
            <div className="flex min-h-[540px] flex-col">
              <header className="border-b border-wa-gray-100 p-4 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">{CATEGORY_LABELS[selectedTicket.category]}</p>
                    <h2 className="mt-1 text-h2 font-semibold text-wa-gray-900">{selectedTicket.subject}</h2>
                    <p className="mt-1 text-body-sm text-wa-gray-500">فُتحت {formatDate(selectedTicket.createdAt)}</p>
                  </div>
                  <span className={cn("self-start rounded-full px-3 py-1 text-body-sm font-semibold", statusClass(selectedTicket.status))}>
                    {STATUS_LABELS[selectedTicket.status]}
                  </span>
                </div>
              </header>
              <div className="flex-1 space-y-3 p-4 sm:p-6">
                {(selectedTicket.messages ?? []).map((message) => (
                  <div key={message.id} className={cn("flex", message.sender === "customer" ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[82%] rounded-2xl px-4 py-3 text-body-sm leading-6",
                        message.sender === "customer" ? "bg-wa-blue-600 text-white" : "border border-wa-gray-100 bg-wa-gray-50 text-wa-gray-800",
                      )}
                    >
                      <p className="text-xs font-semibold opacity-75">{message.sender === "customer" ? "أنت" : "فريق kallem"}</p>
                      <p className="mt-1 whitespace-pre-wrap">{message.content}</p>
                      <p className="mt-2 text-[11px] opacity-65">{formatDate(message.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <footer className="border-t border-wa-gray-100 p-4 sm:p-5">
                {selectedClosed ? (
                  <div className="rounded-2xl bg-wa-gray-50 p-4 text-body-sm text-wa-gray-600">هذه التذكرة مغلقة. افتح تذكرة جديدة لو احتجت مساعدة أخرى.</div>
                ) : (
                  <div className="space-y-3">
                    <Textarea minRows={2} value={reply} onChange={(event) => setReply(event.target.value)} placeholder="اكتب ردك هنا..." />
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <button type="button" onClick={closeTicket} className="text-body-sm font-semibold text-wa-gray-500 hover:text-wa-gray-900">
                        إغلاق التذكرة
                      </button>
                      <Button isLoading={sending} onClick={sendReply} className="rounded-full">
                        <Send className="size-4" aria-hidden="true" />
                        إرسال الرد
                      </Button>
                    </div>
                  </div>
                )}
              </footer>
            </div>
          ) : (
            <div className="flex min-h-[540px] flex-col items-center justify-center p-8 text-center">
              <RefreshCcw className="size-10 text-wa-gray-400" aria-hidden="true" />
              <p className="mt-3 text-body font-semibold text-wa-gray-900">اختر تذكرة أو افتح واحدة جديدة</p>
              <p className="mt-1 max-w-[360px] text-body-sm leading-6 text-wa-gray-600">الدعم داخل التطبيق يساعدك تتابع المشكلة بدون رسائل خارجية.</p>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
