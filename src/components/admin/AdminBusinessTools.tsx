/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Admin mutations stay in a tiny client component while the admin
 * detail page remains server-rendered and cheap to load.
 */
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const planLabels = {
  FREE: "مجاني",
  PRO: "Pro",
  BUSINESS: "Business",
} as const;

type PlanTier = keyof typeof planLabels;

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

export function AdminBusinessTools({ businessId, currentPlan }: { businessId: string; currentPlan: PlanTier }) {
  const router = useRouter();
  const [plan, setPlan] = useState<PlanTier>(currentPlan);
  const [message, setMessage] = useState("");
  const [planStatus, setPlanStatus] = useState<string | null>(null);
  const [messageStatus, setMessageStatus] = useState<string | null>(null);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  async function updatePlan() {
    setIsSavingPlan(true);
    setPlanStatus(null);

    try {
      await readApi(
        await fetch(`/api/admin/businesses/${businessId}/plan`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        }),
      );
      setPlanStatus("تم تحديث الخطة.");
      router.refresh();
    } catch (error) {
      setPlanStatus(error instanceof Error ? error.message : "فشل تحديث الخطة.");
    } finally {
      setIsSavingPlan(false);
    }
  }

  async function sendMessage() {
    if (!message.trim()) return;

    setIsSendingMessage(true);
    setMessageStatus(null);

    try {
      await readApi(
        await fetch(`/api/admin/businesses/${businessId}/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
        }),
      );
      setMessage("");
      setMessageStatus("تم إرسال الرسالة للمالك.");
      router.refresh();
    } catch (error) {
      setMessageStatus(error instanceof Error ? error.message : "فشل إرسال الرسالة.");
    } finally {
      setIsSendingMessage(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-[24px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.035)] sm:p-5">
        <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">إدارة الخطة</p>
        <h2 className="mt-2 text-[22px] font-semibold text-wa-gray-900">تحكم يدوي في خطة العميل</h2>
        <p className="mt-2 text-body-sm leading-6 text-wa-gray-600">
          استخدمها للتجارب، التعويضات، أو حالات الدعم الخاصة. هذا الإجراء يلغي تاريخ انتهاء التجربة النشطة.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Select value={plan} onChange={(event) => setPlan(event.target.value as PlanTier)} aria-label="الخطة">
            {(Object.keys(planLabels) as PlanTier[]).map((option) => (
              <option key={option} value={option}>
                {planLabels[option]}
              </option>
            ))}
          </Select>
          <Button onClick={updatePlan} isLoading={isSavingPlan} className="sm:min-w-32">
            حفظ
          </Button>
        </div>
        {planStatus ? <p className="mt-3 text-body-sm text-wa-gray-600">{planStatus}</p> : null}
      </section>

      <section className="rounded-[24px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.035)] sm:p-5">
        <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">تواصل مع المالك</p>
        <h2 className="mt-2 text-[22px] font-semibold text-wa-gray-900">إرسال رسالة واتساب</h2>
        <p className="mt-2 text-body-sm leading-6 text-wa-gray-600">
          تُرسل الرسالة عبر رقم المالك المتصل عند توفره، مع حفظ سجل للمراجعة.
        </p>
        <Textarea
          className="mt-4"
          minRows={3}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="اكتب رسالة قصيرة للترحيب أو الدعم..."
        />
        <Button onClick={sendMessage} isLoading={isSendingMessage} disabled={!message.trim()} className="mt-3 w-full sm:w-auto">
          إرسال الرسالة
        </Button>
        {messageStatus ? <p className="mt-3 text-body-sm text-wa-gray-600">{messageStatus}</p> : null}
      </section>
    </div>
  );
}
