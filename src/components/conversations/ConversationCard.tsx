// FILE: src/components/conversations/ConversationCard.tsx
"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Conversations replace technical table rows with a compact contact,
 * preview, status, and timestamp surface optimized for one-handed scanning.
 */
import { AlertCircle, Bot, CheckCircle2, MessageCircle, Star, UserRoundCheck } from "lucide-react";

import { ChannelIcon } from "@/components/icons/ChannelIcons";
import { cn } from "@/lib/utils";

export interface ConversationCardProps {
  contactName?: string | null;
  phoneNumber: string;
  channel?: "whatsapp" | "instagram" | "messenger";
  preview: string;
  timestamp: string;
  aiGenerated?: boolean;
  failed?: boolean;
  handoff?: boolean;
  rating?: number | null;
  resolved?: boolean;
  unread?: boolean;
  socialIntent?: string | null;
  selected?: boolean;
  className?: string;
  onClick?: () => void;
}

function initialsFor(value: string) {
  return value.replace(/\D/g, "").slice(-2) || "WA";
}

function channelLabel(channel?: string) {
  if (channel === "instagram") return "إنستجرام";
  if (channel === "messenger") return "ماسنجر";
  return "واتساب";
}

function channelPillClass(channel?: string) {
  if (channel === "instagram") return "bg-pink-50 text-pink-700";
  if (channel === "messenger") return "bg-blue-50 text-blue-700";
  return "bg-green-50 text-green-700";
}

function intentLabel(intent?: string | null) {
  switch (intent) {
    case "collaboration":
    case "influencer_request":
      return "تعاون";
    case "complaint":
      return "شكوى";
    case "order":
      return "طلب";
    case "price_inquiry":
      return "سعر";
    case "spam":
      return "مزعج";
    default:
      return null;
  }
}

function intentPillClass(intent?: string | null) {
  switch (intent) {
    case "collaboration":
    case "influencer_request":
      return "bg-blue-50 text-blue-700";
    case "complaint":
      return "bg-wa-error-bg text-wa-error";
    case "order":
    case "price_inquiry":
      return "bg-wa-success-bg text-wa-success";
    case "spam":
      return "bg-wa-gray-100 text-wa-gray-500";
    default:
      return "";
  }
}

export function ConversationCard({
  aiGenerated = false,
  channel = "whatsapp",
  contactName,
  className,
  failed = false,
  handoff = false,
  rating = null,
  resolved = false,
  onClick,
  phoneNumber,
  preview,
  socialIntent = null,
  selected = false,
  timestamp,
  unread = false,
}: ConversationCardProps) {
  const intent = intentLabel(socialIntent);
  const content = (
    <>
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl border text-body-sm font-semibold transition-colors sm:size-12 sm:rounded-2xl",
          unread || selected
            ? "border-wa-blue-100 bg-wa-blue-50 text-wa-blue-700"
            : "border-wa-gray-100 bg-wa-gray-50 text-wa-gray-600",
        )}
      >
        {contactName ? initialsFor(contactName) : <MessageCircle className="size-4 sm:size-5" aria-hidden="true" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-body-sm font-semibold text-wa-gray-900 sm:text-body">{contactName || phoneNumber}</p>
            <p className="mt-0.5 truncate text-label font-medium uppercase tracking-widest text-wa-gray-400">{phoneNumber}</p>
          </div>
          <time className="shrink-0 text-xs font-medium text-wa-gray-400 sm:text-body-sm">{timestamp}</time>
        </div>
        <p className="mt-1.5 flex min-w-0 items-center gap-2 truncate text-xs text-wa-gray-600 sm:mt-2 sm:text-body-sm">
          <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", channelPillClass(channel))}>
            <ChannelIcon channel={channel} className="size-3" />
            {channelLabel(channel)}
          </span>
          {intent ? (
            <span className={cn("inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold", intentPillClass(socialIntent))}>
              {intent}
            </span>
          ) : null}
          {failed ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-wa-error-bg px-2 py-0.5 text-[10px] font-semibold text-wa-error">
              <AlertCircle className="size-3" aria-hidden="true" />
              يحتاج إعداد
            </span>
          ) : handoff ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-wa-warning-bg px-2 py-0.5 text-[10px] font-semibold text-wa-warning">
              <UserRoundCheck className="size-3" aria-hidden="true" />
              بشري
            </span>
          ) : rating ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-wa-success-bg px-2 py-0.5 text-[10px] font-semibold text-wa-success">
              <Star className="size-3" aria-hidden="true" />
              {rating}/5
            </span>
          ) : resolved ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-wa-gray-100 px-2 py-0.5 text-[10px] font-semibold text-wa-gray-600">
              <CheckCircle2 className="size-3" aria-hidden="true" />
              مغلقة
            </span>
          ) : aiGenerated ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-wa-blue-50 px-2 py-0.5 text-[10px] font-semibold text-wa-blue-700">
              <Bot className="size-3" aria-hidden="true" />
              AI
            </span>
          ) : null}
          {preview}
        </p>
      </div>
      {unread ? (
        <span className="hidden rounded-full bg-wa-blue-50 px-3 py-1 text-[10px] font-semibold text-wa-blue-700 sm:inline-flex" aria-label="محادثة غير مقروءة">
          تحتاج رد
        </span>
      ) : null}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={selected || undefined}
        className={cn(
          "group flex min-h-[78px] w-full items-center gap-2.5 border-b border-wa-gray-100 px-3 py-3 text-right transition-colors hover:bg-wa-gray-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-wa-blue-50 sm:min-h-[96px] sm:gap-3 sm:px-5 sm:py-4",
          selected && "bg-wa-blue-50/60",
          className,
        )}
      >
        {content}
      </button>
    );
  }

  return <div className={cn("flex min-h-[78px] w-full items-center gap-2.5 border-b border-wa-gray-100 px-3 py-3 sm:min-h-[96px] sm:gap-3 sm:px-5 sm:py-4", className)}>{content}</div>;
}
