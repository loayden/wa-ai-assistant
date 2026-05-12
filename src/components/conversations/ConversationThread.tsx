// FILE: src/components/conversations/ConversationThread.tsx
"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Conversation detail is an overlay so reading a thread does not
 * discard dashboard query state or force a separate navigation step.
 */
import { ArrowLeft, Send } from "lucide-react";

import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/utils";

export interface ConversationThreadMessage {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  bodyText: string;
  createdAt: string;
  aiReplyText?: string | null;
}

export interface ConversationThreadProps {
  contactName: string;
  phoneNumber: string;
  messages: ConversationThreadMessage[];
  onBack: () => void;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function ConversationThread({ contactName, messages, onBack, phoneNumber }: ConversationThreadProps) {
  return (
    <section className="absolute inset-0 z-20 flex animate-fade-in flex-col bg-white">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-wa-gray-100 px-4">
        <IconButton label="Back to dashboard" onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
        </IconButton>
        <div className="min-w-0 text-center">
          <p className="truncate text-body font-medium text-wa-gray-800">{contactName}</p>
          <p className="truncate text-body-sm text-wa-gray-400">{phoneNumber}</p>
        </div>
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto bg-wa-gray-50 px-4 py-5">
        <div className="mx-auto w-fit rounded-full border border-wa-gray-100 bg-wa-gray-50 px-3 py-1 text-label font-medium uppercase text-wa-gray-400">
          Today
        </div>
        {messages.map((message) => {
          const outbound = message.direction === "OUTBOUND";

          return (
            <div key={message.id} className={cn("flex flex-col", outbound ? "items-end" : "items-start")}>
              {outbound ? <span className="mb-1 rounded bg-wa-blue-600 px-1.5 py-0.5 text-[9px] font-medium text-white">AI</span> : null}
              <div
                className={cn(
                  "max-w-[75%] px-4 py-2.5 text-body",
                  outbound ? "rounded-[16px_4px_16px_16px] bg-wa-blue-50 text-wa-blue-800" : "rounded-[4px_16px_16px_16px] bg-white text-wa-gray-800",
                )}
              >
                <p>{outbound ? message.aiReplyText || message.bodyText : message.bodyText}</p>
                <time className={cn("mt-1 block text-label font-normal", outbound ? "text-wa-blue-600/60" : "text-wa-gray-400")}>
                  {formatTime(message.createdAt)}
                </time>
              </div>
            </div>
          );
        })}
      </div>
      <form className="border-t border-wa-gray-100 bg-white p-4">
        <div className="flex items-center gap-2 rounded-xl border border-wa-gray-100 bg-wa-gray-50 px-4">
          <input className="h-14 flex-1 bg-transparent text-body outline-none placeholder:text-wa-gray-400" placeholder="Reply manually" />
          <button type="submit" className="text-wa-blue-600" aria-label="Send manual reply">
            <Send className="size-5" aria-hidden="true" />
          </button>
        </div>
        <p className="mt-2 text-body-sm text-wa-gray-400">Sending manually won&apos;t pause AI replies</p>
      </form>
    </section>
  );
}
