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
import { AlertCircle, ArrowLeft, Send } from "lucide-react";

import { IconButton } from "@/components/ui/IconButton";
import { Textarea } from "@/components/ui/textarea";
import { apiData } from "@/lib/api/client";
import { cn } from "@/lib/utils";

export interface ConversationThreadMessage {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  status?: "RECEIVED" | "PROCESSING" | "REPLIED" | "FAILED" | "IGNORED";
  bodyText: string;
  createdAt: string;
  aiReplyText?: string | null;
}

export interface ConversationThreadProps {
  connectionId: string | null;
  contactName: string;
  phoneNumber: string;
  messages: ConversationThreadMessage[];
  onBack: () => void;
  onSent?: () => void;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function ConversationThread({ connectionId, contactName, messages, onBack, onSent, phoneNumber }: ConversationThreadProps) {
  const [draft, setDraft] = useState("");
  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!connectionId) {
        throw new Error("This thread is not linked to an active WhatsApp connection.");
      }

      return apiData("/api/whatsapp/send", {
        method: "POST",
        body: JSON.stringify({
          connectionId,
          to: phoneNumber,
          message: draft.trim(),
        }),
      });
    },
    onSuccess: async () => {
      setDraft("");
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

  return (
    <section className="fixed inset-0 z-50 flex animate-fade-in items-end bg-wa-gray-900/25 p-0 backdrop-blur-[2px] sm:items-center sm:justify-center sm:p-6" role="dialog" aria-modal="true">
      <div className="flex h-[100dvh] w-full max-w-[760px] flex-col overflow-hidden rounded-none border border-wa-gray-100 bg-white shadow-[0_30px_100px_rgba(13,20,33,0.22)] sm:h-[84vh] sm:rounded-[32px]">
        <header className="flex min-h-14 shrink-0 items-center gap-3 border-b border-wa-gray-100 px-3 sm:min-h-16 sm:px-5">
          <IconButton label="Back to inbox" onClick={onBack}>
            <ArrowLeft aria-hidden="true" />
          </IconButton>
          <div className="min-w-0 flex-1">
            <p className="truncate text-body font-semibold text-wa-gray-900">{contactName}</p>
            <p className="truncate text-body-sm text-wa-gray-500">{phoneNumber}</p>
          </div>
          <span className="rounded-full bg-wa-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-wa-blue-700 sm:px-3 sm:text-label">Thread</span>
        </header>
        <div className="flex-1 space-y-3 overflow-y-auto bg-wa-gray-50 px-3 py-4 sm:space-y-4 sm:px-6 sm:py-5">
          <div className="mx-auto w-fit rounded-full border border-wa-gray-100 bg-white px-3 py-1 text-label font-semibold uppercase tracking-widest text-wa-gray-400">
            Conversation
          </div>
          {messages.some((message) => message.status === "FAILED") ? (
            <div className="rounded-2xl border border-wa-error-bg bg-white p-4 text-body-sm leading-6 text-wa-gray-700 shadow-[0_10px_24px_rgba(13,20,33,0.04)]">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-wa-error-bg text-wa-error">
                  <AlertCircle className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold text-wa-error">Reply is blocked by setup</p>
                  <p className="mt-1">
                    The customer message arrived in kallem. The outbound reply was blocked before WhatsApp could deliver it.
                  </p>
                  <div className="mt-3 grid gap-2">
                    <p className="rounded-xl bg-wa-gray-50 px-3 py-2 text-wa-gray-700">
                      Fix AI: add active OpenAI billing/quota or replace the OpenAI key.
                    </p>
                    <p className="rounded-xl bg-wa-gray-50 px-3 py-2 text-wa-gray-700">
                      Fix WhatsApp test mode: approve this customer phone as a Meta test recipient, or connect a production
                      WhatsApp Business number.
                    </p>
                  </div>
                  <Link
                    href="/whatsapp"
                    className="mt-3 inline-flex min-h-10 items-center justify-center rounded-full bg-wa-gray-900 px-4 text-body-sm font-semibold text-white transition hover:bg-wa-gray-700"
                  >
                    Open WhatsApp setup
                  </Link>
                </div>
              </div>
            </div>
          ) : null}
          {messages.length === 0 ? (
            <div className="rounded-2xl border border-wa-gray-100 bg-white p-6 text-center sm:rounded-3xl sm:p-8">
              <p className="text-body font-semibold text-wa-gray-900">No thread history yet</p>
              <p className="mt-2 text-body-sm text-wa-gray-600">New messages from this customer will appear here.</p>
            </div>
          ) : (
            messages.map((message) => {
              const outbound = message.direction === "OUTBOUND";

              return (
                <div key={message.id} className={cn("flex flex-col", outbound ? "items-end" : "items-start")}>
                  {outbound ? <span className="mb-1 rounded-full bg-wa-blue-600 px-2 py-0.5 text-[9px] font-semibold text-white">AI reply</span> : null}
                  <div
                    className={cn(
                      "max-w-[88%] px-3 py-2.5 text-body-sm shadow-[0_10px_24px_rgba(13,20,33,0.04)] sm:max-w-[82%] sm:px-4 sm:py-3 sm:text-body",
                      outbound
                        ? "rounded-[18px_6px_18px_18px] bg-wa-blue-50 text-wa-blue-800"
                        : "rounded-[6px_18px_18px_18px] border border-wa-gray-100 bg-white text-wa-gray-800",
                    )}
                  >
                    <p className="whitespace-pre-wrap">{outbound ? message.aiReplyText || message.bodyText : message.bodyText}</p>
                    <time className={cn("mt-2 block text-label font-medium", outbound ? "text-wa-blue-600/60" : "text-wa-gray-400")}>
                      {formatTime(message.createdAt)}
                    </time>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <form className="border-t border-wa-gray-100 bg-white p-3 sm:p-5" onSubmit={handleSubmit}>
          <div className="space-y-3 rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-3 sm:rounded-3xl">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Send a manual reply"
              maxLength={4096}
              className="min-h-[88px] border-none bg-transparent px-1 py-1 focus-visible:border-none focus-visible:bg-transparent focus-visible:ring-0 sm:min-h-[112px]"
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs leading-5 text-wa-gray-500 sm:text-body-sm">Manual sends do not pause AI replies for future messages.</p>
              <button
                type="submit"
                className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-wa-blue-600 text-white transition active:scale-[0.98] disabled:bg-wa-gray-200 disabled:text-wa-gray-400 sm:size-11 sm:rounded-2xl"
                disabled={!draft.trim() || sendMutation.isPending || !connectionId}
                aria-label="Send manual reply"
              >
                <Send className="size-4 sm:size-5" aria-hidden="true" />
              </button>
            </div>
          </div>
          {sendMutation.error ? (
            <div className="mt-3 flex items-start gap-2 rounded-2xl bg-wa-error-bg px-3 py-3 text-body-sm text-wa-error">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{sendMutation.error instanceof Error ? sendMutation.error.message : "We couldn't send this message."}</span>
            </div>
          ) : null}
        </form>
      </div>
    </section>
  );
}
