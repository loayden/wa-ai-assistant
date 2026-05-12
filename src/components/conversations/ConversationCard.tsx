// FILE: src/components/conversations/ConversationCard.tsx
"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Conversations replace technical table rows with a compact contact,
 * preview, status, and timestamp surface optimized for one-handed scanning.
 */
import { cn } from "@/lib/utils";

export interface ConversationCardProps {
  contactName?: string | null;
  phoneNumber: string;
  preview: string;
  timestamp: string;
  aiGenerated?: boolean;
  unread?: boolean;
  onClick?: () => void;
}

function initialsFor(value: string) {
  return value.replace(/\D/g, "").slice(-2) || "WA";
}

export function ConversationCard({
  aiGenerated = false,
  contactName,
  onClick,
  phoneNumber,
  preview,
  timestamp,
  unread = false,
}: ConversationCardProps) {
  const content = (
    <>
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-wa-gray-100 bg-wa-gray-50 text-body-sm font-medium text-wa-gray-600">
        {initialsFor(contactName || phoneNumber)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-body-sm font-medium text-wa-gray-800">{contactName || phoneNumber}</p>
          <time className="shrink-0 text-label font-normal text-wa-gray-400">{timestamp}</time>
        </div>
        <p className="mt-1 truncate text-body-sm text-wa-gray-400">
          {aiGenerated ? <span className="mr-1 rounded bg-wa-blue-600 px-1 py-0.5 text-[9px] font-medium text-white">AI</span> : null}
          {preview}
        </p>
      </div>
      {unread ? <span className="size-2 rounded-full bg-wa-blue-600" aria-label="Unread conversation" /> : null}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex h-20 w-full items-center gap-3 border-b border-wa-gray-100 px-4 text-left transition-colors hover:bg-wa-gray-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-wa-blue-50"
      >
        {content}
      </button>
    );
  }

  return <div className={cn("flex h-20 w-full items-center gap-3 border-b border-wa-gray-100 px-4")}>{content}</div>;
}
