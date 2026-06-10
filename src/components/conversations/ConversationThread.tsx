// FILE: src/components/conversations/ConversationThread.tsx
"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Conversation detail is an overlay so reading a thread does not
 * discard dashboard query state or force a separate navigation step.
 */
import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, Bot, Check, CheckCircle2, Mic, Pencil, Send, Star, UserRoundCheck, X } from "lucide-react";

import { ChannelIcon } from "@/components/icons/ChannelIcons";
import { IconButton } from "@/components/ui/IconButton";
import { Textarea } from "@/components/ui/textarea";
import { apiData } from "@/lib/api/client";
import type { OutboundFailureClassification } from "@/lib/reliability/outbound";
import { cn } from "@/lib/utils";

export interface ConversationThreadMessage {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  status?: "RECEIVED" | "PROCESSING" | "REPLIED" | "FAILED" | "IGNORED";
  bodyText: string;
  createdAt: string;
  aiReplyText?: string | null;
  aiModelUsed?: string | null;
  metadata?: unknown;
}

export interface ConversationThreadProps {
  className?: string;
  connectionId: string | null;
  contactName: string;
  channel?: "whatsapp" | "instagram" | "messenger";
  channelAccountName?: string | null;
  handoffActive?: boolean;
  resolvedAt?: string | null;
  rating?: number | null;
  ratingRequestedAt?: string | null;
  phoneNumber: string;
  threadId: string;
  messages: ConversationThreadMessage[];
  onBack: () => void;
  onSent?: () => void;
  onThreadUpdated?: (updates: { handoffActive?: boolean; resolvedAt?: string | null; rating?: number | null; ratingRequestedAt?: string | null }) => void;
  variant?: "overlay" | "inline";
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("ar-EG", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function channelLabel(channel?: string) {
  if (channel === "instagram") return "إنستجرام";
  if (channel === "messenger") return "ماسنجر";
  return "واتساب";
}

function metadataObject(metadata: unknown): Record<string, unknown> {
  return metadata && typeof metadata === "object" && !Array.isArray(metadata) ? (metadata as Record<string, unknown>) : {};
}

function extractOutboundFailure(message?: ConversationThreadMessage | null): OutboundFailureClassification | null {
  const metadata = metadataObject(message?.metadata);
  const outboundAttempt = metadataObject(metadata.outboundAttempt);
  const failure = metadataObject(outboundAttempt.failure);

  if (typeof failure.code === "string" && typeof failure.userMessage === "string") {
    return failure as unknown as OutboundFailureClassification;
  }

  return null;
}

export function ConversationThread({
  className,
  connectionId,
  contactName,
  channel = "whatsapp",
  channelAccountName = null,
  handoffActive = false,
  rating = null,
  ratingRequestedAt = null,
  resolvedAt = null,
  messages,
  onBack,
  onSent,
  onThreadUpdated,
  phoneNumber,
  threadId,
  variant = "overlay",
}: ConversationThreadProps) {
  const [draft, setDraft] = useState("");
  const [correctedReply, setCorrectedReply] = useState("");
  const [correctingMessageId, setCorrectingMessageId] = useState<string | null>(null);
  const failedMessage = messages.find((message) => message.status === "FAILED");
  const outboundFailure = extractOutboundFailure(failedMessage);
  const handoffMutation = useMutation({
    mutationFn: async () => apiData(`/api/conversations/${threadId}/handoff`, { method: "POST" }),
    onSuccess: async () => {
      onThreadUpdated?.({ handoffActive: true });
      await onSent?.();
    },
  });
  const resumeMutation = useMutation({
    mutationFn: async () => apiData(`/api/conversations/${threadId}/resume`, { method: "POST" }),
    onSuccess: async () => {
      onThreadUpdated?.({ handoffActive: false });
      await onSent?.();
    },
  });
  const resolveMutation = useMutation({
    mutationFn: async () =>
      apiData<{
        handoff: {
          resolvedAt: string | null;
          rating: number | null;
          ratingRequestedAt: string | null;
        };
      }>(`/api/conversations/${threadId}/resolve`, { method: "POST" }),
    onSuccess: async (data) => {
      onThreadUpdated?.({
        handoffActive: false,
        resolvedAt: data.handoff.resolvedAt,
        rating: data.handoff.rating,
        ratingRequestedAt: data.handoff.ratingRequestedAt,
      });
      await onSent?.();
    },
  });
  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!connectionId) {
        throw new Error("هذه المحادثة غير مرتبطة باتصال نشط.");
      }

      return apiData(`/api/conversations/${threadId}/reply`, {
        method: "POST",
        body: JSON.stringify({
          message: draft.trim(),
        }),
      });
    },
    onSuccess: async () => {
      setDraft("");
      await onSent?.();
    },
  });
  const correctMutation = useMutation({
    mutationFn: async ({ correctReply, messageId }: { correctReply: string; messageId: string }) =>
      apiData(`/api/messages/${messageId}/correct`, {
        method: "POST",
        body: JSON.stringify({ correctReply }),
      }),
    onSuccess: async () => {
      setCorrectingMessageId(null);
      setCorrectedReply("");
      await onSent?.();
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim() || sendMutation.isPending) {
      return;
    }

    sendMutation.mutate();
  }

  function startCorrection(message: ConversationThreadMessage) {
    setCorrectingMessageId(message.id);
    setCorrectedReply(message.aiReplyText || message.bodyText);
  }

  function cancelCorrection() {
    setCorrectingMessageId(null);
    setCorrectedReply("");
  }

  function submitCorrection(messageId: string) {
    const trimmedReply = correctedReply.trim();

    if (!trimmedReply || correctMutation.isPending) {
      return;
    }

    correctMutation.mutate({ correctReply: trimmedReply, messageId });
  }

  const inline = variant === "inline";

  return (
    <section
      className={cn(
        inline
          ? "flex h-full min-h-0 flex-col bg-transparent"
          : "fixed inset-0 z-50 flex animate-fade-in items-end bg-wa-gray-900/25 p-0 backdrop-blur-[2px] sm:items-center sm:justify-center sm:p-6",
        className,
      )}
      role={inline ? undefined : "dialog"}
      aria-modal={inline ? undefined : "true"}
    >
      <div
        className={cn(
          "flex min-h-0 w-full flex-col overflow-hidden",
          inline
            ? "h-full max-w-none rounded-none border-0 bg-transparent shadow-none"
            : "h-[100dvh] max-w-[760px] rounded-none border border-wa-gray-100 bg-white shadow-[0_30px_100px_rgba(13,20,33,0.22)] sm:h-[84vh] sm:rounded-[32px]",
        )}
      >
        <header className="flex min-h-14 shrink-0 items-center gap-3 border-b border-wa-gray-100 px-3 sm:min-h-16 sm:px-5">
          <IconButton className={inline ? "lg:hidden" : undefined} label="الرجوع للرسائل" onClick={onBack}>
            <ArrowLeft aria-hidden="true" />
          </IconButton>
          <div className="min-w-0 flex-1">
            <p className="truncate text-body font-semibold text-wa-gray-900">{contactName}</p>
            <p className="flex items-center gap-1.5 truncate text-body-sm text-wa-gray-500">
              <ChannelIcon channel={channel} className="size-4 shrink-0" />
              <span className="truncate">{channelLabel(channel)}{channelAccountName ? ` · ${channelAccountName}` : ""} · {phoneNumber}</span>
            </p>
          </div>
          <span className="rounded-full bg-wa-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-wa-blue-700 sm:px-3 sm:text-label">المحادثة</span>
          {rating ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-wa-success-bg px-2.5 py-1 text-[10px] font-semibold text-wa-success sm:px-3 sm:text-label">
              <Star className="size-3" aria-hidden="true" />
              {rating}/5
            </span>
          ) : resolvedAt ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-wa-gray-50 px-2.5 py-1 text-[10px] font-semibold text-wa-gray-600 sm:px-3 sm:text-label">
              <CheckCircle2 className="size-3" aria-hidden="true" />
              مغلقة
            </span>
          ) : ratingRequestedAt ? (
            <span className="rounded-full bg-wa-blue-50 px-2.5 py-1 text-[10px] font-semibold text-wa-blue-700 sm:px-3 sm:text-label">تم طلب التقييم</span>
          ) : null}
        </header>
        <div className="flex-1 space-y-3 overflow-y-auto bg-wa-gray-50 px-3 py-4 sm:space-y-4 sm:px-6 sm:py-5">
          <div className="mx-auto w-fit rounded-full border border-wa-gray-100 bg-white px-3 py-1 text-label font-semibold uppercase tracking-widest text-wa-gray-400">
            المحادثة
          </div>
          {handoffActive ? (
            <div className="rounded-2xl border border-wa-warning-bg bg-white p-4 text-body-sm leading-6 text-wa-gray-700 shadow-[0_10px_24px_rgba(13,20,33,0.04)]">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-wa-warning-bg text-wa-warning">
                  <UserRoundCheck className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-wa-gray-900">المساعد متوقف — أنت تتحكم الآن</p>
                  <p className="mt-1 text-wa-gray-600">أي رسالة جديدة من هذا العميل ستظهر هنا ولن يرد عليها المساعد حتى تضغط استئناف.</p>
                </div>
              </div>
            </div>
          ) : null}
          {failedMessage ? (
            <div className="rounded-2xl border border-wa-error-bg bg-white p-4 text-body-sm leading-6 text-wa-gray-700 shadow-[0_10px_24px_rgba(13,20,33,0.04)]">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-wa-error-bg text-wa-error">
                  <AlertCircle className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold text-wa-error">لم يتم إرسال الرد</p>
                  <p className="mt-1">
                    {outboundFailure?.title ?? "وصلت رسالة العميل إلى kallem، لكن الرد توقف قبل إرساله عبر القناة."}
                  </p>
                  <p className="mt-3 rounded-xl bg-wa-gray-50 px-3 py-2 text-wa-gray-700">
                    {outboundFailure?.userMessage ??
                      failedMessage.aiReplyText ??
                      "راجعي صلاحيات القناة، وهل الاتصال جاهز لجمهور حقيقي وليس وضع اختبار فقط."}
                  </p>
                  {outboundFailure ? (
                    <div className="mt-3 rounded-xl bg-wa-gray-50 px-3 py-2 text-wa-gray-700">
                      <p className="font-semibold text-wa-gray-900">الخطوة التالية</p>
                      <p className="mt-1">{outboundFailure.fixHint}</p>
                      <p className="mt-1 text-label font-semibold uppercase tracking-widest text-wa-gray-500">
                        {outboundFailure.retry.canRetry ? "يمكن إعادة المحاولة لاحقاً" : "لا تعيدي المحاولة قبل إصلاح السبب"}
                      </p>
                    </div>
                  ) : null}
                  <Link
                    href={outboundFailure?.actionHref ?? "/connect"}
                    className="mt-3 inline-flex min-h-10 items-center justify-center rounded-full bg-wa-gray-900 px-4 text-body-sm font-semibold text-white transition hover:bg-wa-gray-700"
                  >
                    {outboundFailure?.actionLabel ?? "فتح إعداد القنوات"}
                  </Link>
                </div>
              </div>
            </div>
          ) : null}
          {messages.length === 0 ? (
            <div className="rounded-2xl border border-wa-gray-100 bg-white p-6 text-center sm:rounded-3xl sm:p-8">
              <p className="text-body font-semibold text-wa-gray-900">لا يوجد سجل محادثة بعد</p>
              <p className="mt-2 text-body-sm text-wa-gray-600">الرسائل الجديدة من هذا العميل ستظهر هنا.</p>
            </div>
          ) : (
            messages.map((message) => {
              const outbound = message.direction === "OUTBOUND";
              const metadata = metadataObject(message.metadata);
              const metadataType = typeof metadata.type === "string" ? metadata.type : null;
              const messageFailure = extractOutboundFailure(message);
              const voiceTranscribed = !outbound && metadataType === "voice_transcribed";
              const humanSent =
                outbound &&
                (!message.aiModelUsed || message.aiModelUsed === "manual-reply" || message.aiModelUsed === "human-corrected");
              const canCorrect = outbound && !humanSent && message.status === "REPLIED";
              const displayText = outbound ? message.aiReplyText || message.bodyText : message.bodyText;

              return (
                <div key={message.id} className={cn("flex flex-col", outbound ? "items-end" : "items-start")}>
                  {outbound ? (
                    <span
                      className={cn(
                        "mb-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold text-white",
                        humanSent ? "bg-wa-warning" : "bg-wa-blue-600",
                      )}
                    >
                      {humanSent ? <UserRoundCheck className="size-3" aria-hidden="true" /> : <Bot className="size-3" aria-hidden="true" />}
                      {message.aiModelUsed === "human-corrected" ? "أنت صححت الرد" : humanSent ? "أنت" : "رد المساعد"}
                    </span>
                  ) : null}
                  <div
                    className={cn(
                      "max-w-[88%] px-3 py-2.5 text-body-sm shadow-[0_10px_24px_rgba(13,20,33,0.04)] sm:max-w-[82%] sm:px-4 sm:py-3 sm:text-body",
                      voiceTranscribed
                        ? "rounded-[6px_18px_18px_18px] border border-wa-gray-200 bg-wa-gray-100 text-wa-gray-800"
                        : outbound
                        ? humanSent
                          ? "rounded-[18px_6px_18px_18px] bg-wa-warning-bg text-wa-gray-900"
                          : "rounded-[18px_6px_18px_18px] bg-wa-blue-50 text-wa-blue-800"
                        : "rounded-[6px_18px_18px_18px] border border-wa-gray-100 bg-white text-wa-gray-800",
                    )}
                  >
                    {voiceTranscribed ? (
                      <p className="mb-1.5 inline-flex items-center gap-1.5 text-label font-semibold uppercase tracking-widest text-wa-gray-500">
                        <Mic className="size-3.5" aria-hidden="true" />
                        نص الرسالة الصوتية
                      </p>
                    ) : null}
                    <p className={cn("whitespace-pre-wrap", voiceTranscribed && "italic")}>{displayText}</p>
                    <time className={cn("mt-2 block text-label font-medium", outbound ? "text-wa-blue-600/60" : "text-wa-gray-400")}>
                      {formatTime(message.createdAt)}
                    </time>
                  </div>
                  {messageFailure ? (
                    <div className="mt-1.5 max-w-[88%] rounded-2xl border border-wa-error-bg bg-white px-3 py-2 text-body-sm text-wa-error shadow-[0_10px_24px_rgba(13,20,33,0.04)] sm:max-w-[82%]">
                      <p className="font-semibold">{messageFailure.title}</p>
                      <p className="mt-1 text-wa-gray-700">{messageFailure.fixHint}</p>
                    </div>
                  ) : null}
                  {canCorrect ? (
                    <button
                      type="button"
                      className="mt-1.5 inline-flex min-h-8 items-center gap-1 rounded-full border border-wa-gray-100 bg-white px-2.5 text-[11px] font-semibold text-wa-gray-600 transition hover:border-wa-blue-100 hover:bg-wa-blue-50 hover:text-wa-blue-700"
                      onClick={() => startCorrection(message)}
                    >
                      <Pencil className="size-3.5" aria-hidden="true" />
                      تصحيح
                    </button>
                  ) : null}
                  {correctingMessageId === message.id ? (
                    <div className="mt-2 w-full max-w-[88%] rounded-2xl border border-wa-blue-100 bg-white p-3 shadow-[0_12px_30px_rgba(37,99,235,0.08)] sm:max-w-[82%]">
                      <label className="text-label font-semibold uppercase tracking-widest text-wa-gray-400" htmlFor={`correct-${message.id}`}>
                        تصحيح رد المساعد
                      </label>
                      <Textarea
                        id={`correct-${message.id}`}
                        value={correctedReply}
                        onChange={(event) => setCorrectedReply(event.target.value)}
                        className="mt-2 min-h-[96px] rounded-2xl bg-wa-gray-50"
                        maxLength={4096}
                      />
                      <div className="mt-3 flex justify-end gap-2">
                        <button
                          type="button"
                          className="inline-flex min-h-9 items-center gap-1 rounded-full border border-wa-gray-200 px-3 text-body-sm font-semibold text-wa-gray-600 transition hover:bg-wa-gray-50"
                          onClick={cancelCorrection}
                        >
                          <X className="size-4" aria-hidden="true" />
                          إلغاء
                        </button>
                        <button
                          type="button"
                          className="inline-flex min-h-9 items-center gap-1 rounded-full bg-wa-blue-600 px-3 text-body-sm font-semibold text-white transition hover:bg-[#1447E6] disabled:bg-wa-gray-200"
                          disabled={!correctedReply.trim() || correctMutation.isPending}
                          onClick={() => submitCorrection(message.id)}
                        >
                          <Check className="size-4" aria-hidden="true" />
                          حفظ وأرسل
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
        <form className="border-t border-wa-gray-100 bg-white p-3 sm:p-5" onSubmit={handleSubmit}>
          {handoffActive ? (
            <div className="space-y-3 rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-3 sm:rounded-3xl">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-body-sm font-semibold text-wa-gray-900">اكتب رد يدوي للعميل</p>
                <button
                  type="button"
                  onClick={() => resumeMutation.mutate()}
                  className="inline-flex min-h-9 items-center justify-center rounded-full border border-wa-gray-100 bg-white px-3 text-body-sm font-semibold text-wa-blue-600 transition hover:bg-wa-blue-50 disabled:text-wa-gray-400"
                  disabled={resumeMutation.isPending}
                >
                  استئناف المساعد
                </button>
                <button
                  type="button"
                  onClick={() => resolveMutation.mutate()}
                  className="inline-flex min-h-9 items-center justify-center rounded-full border border-wa-gray-100 bg-white px-3 text-body-sm font-semibold text-wa-gray-700 transition hover:bg-wa-gray-50 disabled:text-wa-gray-400"
                  disabled={resolveMutation.isPending || Boolean(resolvedAt)}
                >
                  إغلاق المحادثة
                </button>
              </div>
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="اكتب ردك هنا"
                maxLength={4096}
                className="min-h-[88px] border-none bg-transparent px-1 py-1 focus-visible:border-none focus-visible:bg-transparent focus-visible:ring-0 sm:min-h-[112px]"
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs leading-5 text-wa-gray-500 sm:text-body-sm">الرد اليدوي لا يستهلك من رصيد الردود التلقائية.</p>
                <button
                  type="submit"
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-wa-blue-600 text-white transition active:scale-[0.98] disabled:bg-wa-gray-200 disabled:text-wa-gray-400 sm:size-11 sm:rounded-2xl"
                  disabled={!draft.trim() || sendMutation.isPending || !connectionId}
                  aria-label="إرسال رد يدوي"
                >
                  <Send className="size-4 sm:size-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-3 sm:rounded-3xl">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-body-sm font-semibold text-wa-gray-900">عايز ترد بنفسك؟</p>
                  <p className="mt-1 text-body-sm leading-5 text-wa-gray-600">سلّم المحادثة للبشر لإيقاف الردود التلقائية على هذا العميل فقط.</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => resolveMutation.mutate()}
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-wa-gray-200 bg-white px-4 text-body-sm font-semibold text-wa-gray-700 transition hover:bg-wa-gray-50 disabled:text-wa-gray-400"
                    disabled={resolveMutation.isPending || Boolean(resolvedAt)}
                  >
                    إغلاق المحادثة
                  </button>
                  <button
                    type="button"
                    onClick={() => handoffMutation.mutate()}
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-wa-gray-900 px-4 text-body-sm font-semibold text-white transition hover:bg-wa-gray-700 disabled:bg-wa-gray-200"
                    disabled={handoffMutation.isPending}
                  >
                    تسليم للبشر
                  </button>
                </div>
              </div>
            </div>
          )}
          {sendMutation.error || handoffMutation.error || resumeMutation.error || resolveMutation.error || correctMutation.error ? (
            <div className="mt-3 flex items-start gap-2 rounded-2xl bg-wa-error-bg px-3 py-3 text-body-sm text-wa-error">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                {sendMutation.error instanceof Error
                  ? sendMutation.error.message
                  : handoffMutation.error instanceof Error
                    ? handoffMutation.error.message
                    : resumeMutation.error instanceof Error
                      ? resumeMutation.error.message
                      : resolveMutation.error instanceof Error
                        ? resolveMutation.error.message
                        : correctMutation.error instanceof Error
                          ? correctMutation.error.message
                      : "لم نتمكن من تحديث هذه المحادثة."}
              </span>
            </div>
          ) : null}
        </form>
      </div>
    </section>
  );
}
