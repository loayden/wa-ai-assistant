// FILE: src/components/messages/MessageList.tsx
"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: The full inbox keeps the existing paginated API but replaces
 * backend-flavored tables with scan-friendly conversation cards.
 */
import { useDeferredValue, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Bot, CheckCircle2, Clock3, Inbox, MessageSquareText, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { ConversationCard } from "@/components/conversations/ConversationCard";
import { ConversationThread } from "@/components/conversations/ConversationThread";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useMessages, type MessageDirectionFilter, type MessageRecord, type MessageStatusFilter } from "@/hooks/useMessages";
import { cn } from "@/lib/utils";

type DirectionOption = "ALL" | MessageDirectionFilter;
type StatusOption = "ALL" | MessageStatusFilter;
type SimpleFilter = "ALL" | "UNANSWERED" | "TODAY";

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function isToday(value: string) {
  const date = new Date(value);
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

export function MessageList() {
  const [page, setPage] = useState(1);
  const [direction] = useState<DirectionOption>("ALL");
  const [status, setStatus] = useState<StatusOption>("ALL");
  const [simpleFilter, setSimpleFilter] = useState<SimpleFilter>("ALL");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [activeConversation, setActiveConversation] = useState<MessageRecord | null>(null);
  const limit = 20;
  const messagesResult = useMessages({
    page,
    limit,
    direction: direction === "ALL" ? undefined : direction,
    status: status === "ALL" ? undefined : status,
  });
  const totalPages = Math.max(1, Math.ceil(messagesResult.total / limit));

  const filteredMessages = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();

    return messagesResult.messages.filter((message) => {
      const matchesSimpleFilter =
        simpleFilter === "ALL" ||
        (simpleFilter === "UNANSWERED" && message.status === "RECEIVED") ||
        (simpleFilter === "TODAY" && isToday(message.createdAt));
      const matchesSearch =
        !normalizedSearch ||
        [message.bodyText, message.aiReplyText, message.fromNumber, message.toNumber]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch));

      return matchesSimpleFilter && matchesSearch;
    });
  }, [deferredSearch, messagesResult.messages, simpleFilter]);

  const threadMessages = useMemo(() => {
    if (!activeConversation) {
      return [];
    }

    const phone = activeConversation.fromNumber;
    return messagesResult.messages.filter((message) => message.fromNumber === phone || message.toNumber === phone);
  }, [activeConversation, messagesResult.messages]);

  const chips: Array<{ value: SimpleFilter; label: string }> = [
    { value: "ALL", label: "All" },
    { value: "UNANSWERED", label: "Unanswered" },
    { value: "TODAY", label: "Today" },
  ];
  const unansweredCount = messagesResult.messages.filter((message) => message.status === "RECEIVED").length;
  const aiRepliesCount = messagesResult.messages.filter((message) => message.status === "REPLIED" && Boolean(message.aiReplyText)).length;
  const failedCount = messagesResult.messages.filter((message) => message.status === "FAILED").length;
  const todayCount = messagesResult.messages.filter((message) => isToday(message.createdAt)).length;

  return (
    <div className="relative mx-auto max-w-[1120px] px-3 pb-8 pt-4 sm:px-6 lg:pt-10">
      <header className="mb-4 overflow-hidden rounded-[22px] border border-wa-gray-100 bg-white shadow-[0_18px_56px_rgba(13,20,33,0.05)] sm:mb-5 sm:rounded-[28px]">
        <div className="flex flex-col gap-4 bg-[linear-gradient(135deg,#ffffff_0%,#f6f8ff_100%)] p-4 sm:gap-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[680px]">
            <Link
              className="mb-4 inline-flex min-h-9 items-center gap-2 rounded-full border border-wa-gray-100 bg-white px-3 text-body-sm font-semibold text-wa-gray-600 transition hover:bg-wa-gray-50 sm:mb-5 sm:min-h-10 sm:px-4"
              href="/dashboard"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Dashboard
            </Link>
            <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">Messages</p>
            <h1 className="mt-2 text-[28px] font-semibold leading-tight text-wa-gray-900 sm:mt-3 sm:text-[46px]">Customer inbox built for daily review.</h1>
            <p className="mt-3 text-body-sm leading-6 text-wa-gray-600 sm:mt-4 sm:text-body-lg">
              Search conversations, find messages that need attention, and open any thread without leaving the operational inbox.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:w-[380px] lg:grid-cols-1">
            <InboxHeroStat label="Visible" value={String(filteredMessages.length)} />
            <InboxHeroStat label="Needs reply" value={String(unansweredCount)} tone={unansweredCount > 0 ? "attention" : "calm"} />
            <InboxHeroStat label="AI replies" value={String(aiRepliesCount)} />
            {failedCount > 0 ? <InboxHeroStat label="Needs setup" value={String(failedCount)} tone="attention" /> : null}
          </div>
        </div>
      </header>

      <section className="grid gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-[22px] border border-wa-gray-100 bg-white shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px]">
          <div className="border-b border-wa-gray-100 p-4 sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-wa-gray-400 sm:left-4" aria-hidden="true" />
                <Input
                  className="h-11 rounded-2xl bg-wa-gray-50 pl-10 sm:h-12 sm:pl-11"
                  placeholder="Search by message or phone number"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {chips.map((chip) => (
                  <button
                    key={chip.value}
                    type="button"
                    className={cn(
                      "min-h-10 rounded-full border px-3 text-body-sm font-semibold transition-colors sm:min-h-11 sm:px-4",
                      simpleFilter === chip.value
                        ? "border-wa-blue-600 bg-wa-blue-50 text-wa-blue-800"
                        : "border-wa-gray-100 bg-white text-wa-gray-600 hover:bg-wa-gray-50",
                    )}
                    onClick={() => {
                      setSimpleFilter(chip.value);
                      setStatus(chip.value === "UNANSWERED" ? "RECEIVED" : "ALL");
                      setPage(1);
                    }}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {messagesResult.isLoading ? (
            <div className="space-y-2.5 p-4 sm:space-y-3 sm:p-5">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-20 w-full rounded-2xl sm:h-24" />)}</div>
          ) : messagesResult.error ? (
            <div className="p-5">
              <Alert>
                <AlertTitle>Messages unavailable</AlertTitle>
                <AlertDescription>{messagesResult.error.message}</AlertDescription>
              </Alert>
            </div>
          ) : filteredMessages.length === 0 ? (
            <InboxEmptyState
              title={search || simpleFilter !== "ALL" ? "No conversations match this view" : "No messages yet"}
              body={search || simpleFilter !== "ALL" ? "Try a different search or clear the filters to see more conversations." : "Once customers message your connected WhatsApp number, conversations will appear here."}
            />
          ) : (
            filteredMessages.map((message) => (
              <ConversationCard
                key={message.id}
                aiGenerated={message.status === "REPLIED" && Boolean(message.aiReplyText)}
                contactName={message.connection?.displayName}
                failed={message.status === "FAILED"}
                phoneNumber={message.fromNumber}
                preview={message.status === "FAILED" ? "Reply did not send. Open this thread to see what needs setup." : message.aiReplyText ?? message.bodyText}
                timestamp={formatTimestamp(message.createdAt)}
                unread={message.status === "RECEIVED"}
                selected={activeConversation?.id === message.id}
                onClick={() => setActiveConversation(message)}
              />
            ))
          )}

          <div className="flex flex-col gap-3 border-t border-wa-gray-100 p-4 text-body-sm text-wa-gray-600 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Page {page} of {totalPages}
              {messagesResult.query.isFetching ? <span className="ml-2 text-wa-blue-600">Updating...</span> : null}
            </span>
            <div className="flex gap-2">
              <Button disabled={page <= 1} size="sm" variant="outline" onClick={() => setPage((value) => Math.max(1, value - 1))}>
                Previous
              </Button>
              <Button disabled={page >= totalPages} size="sm" variant="outline" onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
                Next
              </Button>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <section className="rounded-[22px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px] sm:p-5">
            <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">Inbox health</p>
            <div className="mt-4 grid gap-3">
              <InboxHealthRow
                icon={<CheckCircle2 className="size-4" aria-hidden="true" />}
                label="Today"
                value={`${todayCount} messages`}
                tone={todayCount > 0 ? "blue" : "neutral"}
              />
              <InboxHealthRow
                icon={<Bot className="size-4" aria-hidden="true" />}
                label="AI assisted"
                value={`${aiRepliesCount} replies`}
                tone="blue"
              />
              <InboxHealthRow
                icon={<ShieldCheck className="size-4" aria-hidden="true" />}
                label="Review status"
                value={failedCount > 0 ? `${failedCount} setup issue` : unansweredCount > 0 ? `${unansweredCount} waiting` : "Clear"}
                tone={failedCount > 0 || unansweredCount > 0 ? "attention" : "success"}
              />
            </div>
          </section>

          {failedCount > 0 ? (
            <section className="rounded-[22px] border border-wa-error-bg bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px] sm:p-5">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-wa-error-bg text-wa-error">
                  <AlertCircle className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-body-sm font-semibold text-wa-gray-900">Automatic reply needs setup</p>
                  <p className="mt-2 text-body-sm leading-6 text-wa-gray-600">
                    The message arrived, but the reply was blocked before delivery. Make sure OpenAI has active quota, then
                    use a production WhatsApp Business number for real customers.
                  </p>
                  <p className="mt-2 rounded-2xl bg-wa-gray-50 px-3 py-2 text-body-sm leading-6 text-wa-gray-600">
                    If this is still a Meta test number, Meta only allows replies to approved test phones.
                  </p>
                  <Link
                    href="/whatsapp"
                    className="mt-3 inline-flex min-h-10 items-center justify-center rounded-full bg-wa-gray-900 px-4 text-body-sm font-semibold text-white transition hover:bg-wa-gray-700"
                  >
                    Check setup
                  </Link>
                </div>
              </div>
            </section>
          ) : null}

          <section className="rounded-[22px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px] sm:p-5">
            <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">Daily workflow</p>
            <div className="mt-4 space-y-3">
              <WorkflowRow icon={<Inbox className="size-4" aria-hidden="true" />} title="Check unread messages" body="Start with conversations marked Needs reply." />
              <WorkflowRow icon={<MessageSquareText className="size-4" aria-hidden="true" />} title="Open a thread" body="Review the customer message and AI response in context." />
              <WorkflowRow icon={<Clock3 className="size-4" aria-hidden="true" />} title="Follow up manually" body="Send a direct message when the owner should handle the answer." />
            </div>
            <Link
              href="/whatsapp"
              className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-wa-gray-200 text-body-sm font-semibold text-wa-gray-700 transition hover:bg-wa-gray-50 sm:mt-5 sm:min-h-11"
            >
              Check WhatsApp setup
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </section>
        </aside>
      </section>
      {activeConversation ? (
        <ConversationThread
          connectionId={activeConversation.connectionId}
          contactName={activeConversation.connection?.displayName ?? activeConversation.fromNumber}
          phoneNumber={activeConversation.fromNumber}
          messages={threadMessages}
          onBack={() => setActiveConversation(null)}
          onSent={() => messagesResult.refetch().then(() => undefined)}
        />
      ) : null}
    </div>
  );
}

function InboxHeroStat({ label, tone = "calm", value }: { label: string; tone?: "calm" | "attention"; value: string }) {
  return (
    <div className={cn("rounded-2xl border bg-white p-3 sm:p-4", tone === "attention" ? "border-wa-blue-100" : "border-wa-gray-100")}>
      <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">{label}</p>
      <p className={cn("mt-1 text-h3 font-semibold sm:text-h2", tone === "attention" ? "text-wa-blue-600" : "text-wa-gray-900")}>{value}</p>
    </div>
  );
}

function InboxEmptyState({ body, title }: { body: string; title: string }) {
  return (
    <div className="p-6 text-center sm:p-12">
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-wa-blue-50 sm:size-16 sm:rounded-3xl">
        <Inbox className="size-6 text-wa-blue-600 sm:size-7" aria-hidden="true" />
      </div>
      <p className="mt-4 text-h3 font-semibold text-wa-gray-900">{title}</p>
      <p className="mx-auto mt-2 max-w-[440px] text-body-sm leading-6 text-wa-gray-600">{body}</p>
    </div>
  );
}

function InboxHealthRow({
  icon,
  label,
  tone,
  value,
}: {
  icon: ReactNode;
  label: string;
  tone: "attention" | "blue" | "neutral" | "success";
  value: string;
}) {
  const toneClasses = {
    attention: "bg-wa-blue-50 text-wa-blue-600",
    blue: "bg-wa-blue-50 text-wa-blue-600",
    neutral: "bg-wa-gray-50 text-wa-gray-500",
    success: "bg-wa-success-bg text-wa-success",
  };

  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-3 sm:gap-3">
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl sm:size-10 sm:rounded-2xl", toneClasses[tone])}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-body-sm font-semibold text-wa-gray-900">{label}</span>
        <span className="block truncate text-body-sm text-wa-gray-600">{value}</span>
      </span>
    </div>
  );
}

function WorkflowRow({ body, icon, title }: { body: string; icon: ReactNode; title: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-wa-gray-50 text-wa-gray-500 sm:size-9 sm:rounded-2xl">{icon}</span>
      <span>
        <span className="block text-body-sm font-semibold text-wa-gray-900">{title}</span>
        <span className="mt-0.5 block text-body-sm leading-5 text-wa-gray-600">{body}</span>
      </span>
    </div>
  );
}
