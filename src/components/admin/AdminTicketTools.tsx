/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Ticket status, priority, and reply actions use a compact client
 * island so admin ticket pages can stay server-rendered.
 */
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type TicketStatus = "open" | "in_progress" | "waiting_customer" | "resolved" | "closed";
type TicketPriority = "low" | "normal" | "high" | "urgent";

const statusLabels: Record<TicketStatus, string> = {
  open: "مفتوحة",
  in_progress: "جار المعالجة",
  waiting_customer: "بانتظار العميل",
  resolved: "تم الحل",
  closed: "مغلقة",
};

const priorityLabels: Record<TicketPriority, string> = {
  low: "منخفضة",
  normal: "عادية",
  high: "مرتفعة",
  urgent: "عاجلة",
};

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

async function readApi<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || !payload.success) {
    throw new Error(payload.error ?? "فشل الطلب.");
  }

  return payload.data as T;
}

export function AdminTicketTools({
  initialPriority,
  initialStatus,
  ticketId,
}: {
  initialPriority: TicketPriority;
  initialStatus: TicketStatus;
  ticketId: string;
}) {
  const router = useRouter();
  const [priority, setPriority] = useState(initialPriority);
  const [status, setStatus] = useState(initialStatus);
  const [reply, setReply] = useState("");
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isReplying, setIsReplying] = useState(false);

  async function updateTicket() {
    setIsUpdating(true);
    setActionStatus(null);

    try {
      await readApi(
        await fetch(`/api/tickets/${ticketId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priority, status }),
        }),
      );
      setActionStatus("تم تحديث الطلب.");
      router.refresh();
    } catch (error) {
      setActionStatus(error instanceof Error ? error.message : "فشل تحديث الطلب.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function sendReply() {
    if (!reply.trim()) return;

    setIsReplying(true);
    setActionStatus(null);

    try {
      await readApi(
        await fetch(`/api/tickets/${ticketId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: reply }),
        }),
      );
      setReply("");
      setActionStatus("تم إرسال الرد.");
      router.refresh();
    } catch (error) {
      setActionStatus(error instanceof Error ? error.message : "فشل إرسال الرد.");
    } finally {
      setIsReplying(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[24px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.035)] sm:p-5">
        <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">إدارة الطلب</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="space-y-2 text-body-sm font-semibold text-wa-gray-700">
            الحالة
            <Select value={status} onChange={(event) => setStatus(event.target.value as TicketStatus)}>
              {(Object.keys(statusLabels) as TicketStatus[]).map((option) => (
                <option key={option} value={option}>
                  {statusLabels[option]}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-2 text-body-sm font-semibold text-wa-gray-700">
            الأولوية
            <Select value={priority} onChange={(event) => setPriority(event.target.value as TicketPriority)}>
              {(Object.keys(priorityLabels) as TicketPriority[]).map((option) => (
                <option key={option} value={option}>
                  {priorityLabels[option]}
                </option>
              ))}
            </Select>
          </label>
        </div>
        <Button onClick={updateTicket} isLoading={isUpdating} className="mt-4 w-full">
          حفظ الطلب
        </Button>
      </section>

      <section className="rounded-[24px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.035)] sm:p-5">
        <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">رد الإدارة</p>
        <Textarea
          className="mt-4"
          minRows={4}
          value={reply}
          onChange={(event) => setReply(event.target.value)}
          placeholder="اكتب رداً واضحاً ومفيداً للعميل..."
        />
        <Button onClick={sendReply} isLoading={isReplying} disabled={!reply.trim()} className="mt-3 w-full">
          إرسال الرد
        </Button>
        {actionStatus ? <p className="mt-3 text-body-sm text-wa-gray-600">{actionStatus}</p> : null}
      </section>
    </div>
  );
}
