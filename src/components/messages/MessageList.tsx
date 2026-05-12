// FILE: src/components/messages/MessageList.tsx
"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: The full inbox keeps the existing paginated API but replaces
 * backend-flavored tables with scan-friendly conversation cards.
 */
import { useMemo, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
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
    const normalizedSearch = search.trim().toLowerCase();

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
  }, [messagesResult.messages, search, simpleFilter]);

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

  return (
    <div className="mx-auto max-w-[480px] px-4 pb-8 pt-6">
      <header className="mb-6 flex items-center gap-3">
        <Link className="flex size-11 items-center justify-center rounded-xl bg-white text-wa-gray-600" href="/dashboard" aria-label="Back to dashboard">
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
        <div>
          <h1 className="text-h1 font-medium text-wa-gray-900">Messages</h1>
          <p className="text-body-sm text-wa-gray-600">All customer conversations</p>
        </div>
      </header>
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-wa-gray-400" aria-hidden="true" />
          <Input className="pl-11" placeholder="Search conversations" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <div className="flex gap-2">
          {chips.map((chip) => (
            <button
              key={chip.value}
              type="button"
              className={cn(
                "h-11 rounded-full border px-4 text-body-sm font-medium transition-colors",
                simpleFilter === chip.value ? "border-wa-blue-600 bg-wa-blue-50 text-wa-blue-800" : "border-wa-gray-100 bg-white text-wa-gray-600",
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
      <section className="mt-5 overflow-hidden rounded-xl border border-wa-gray-100 bg-white">
        {messagesResult.isLoading ? (
          <div className="space-y-3 p-5">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-20 w-full" />)}</div>
        ) : messagesResult.error ? (
          <Alert>
            <AlertTitle>Messages unavailable</AlertTitle>
            <AlertDescription>{messagesResult.error.message}</AlertDescription>
          </Alert>
        ) : filteredMessages.length === 0 ? (
          <div className="p-8 text-center text-body text-wa-gray-600">No conversations match this view.</div>
        ) : (
          filteredMessages.map((message) => (
            <ConversationCard
              key={message.id}
              aiGenerated={!!message.aiReplyText}
              contactName={message.connection?.displayName}
              phoneNumber={message.fromNumber}
              preview={message.aiReplyText ?? message.bodyText}
              timestamp={formatTimestamp(message.createdAt)}
              unread={message.status === "RECEIVED"}
              onClick={() => setActiveConversation(message)}
            />
          ))
        )}
      </section>
      <div className="mt-5 flex items-center justify-between text-body-sm text-wa-gray-600">
        <span>Page {page} of {totalPages}</span>
        <div className="flex gap-2">
          <Button disabled={page <= 1} variant="outline" onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button>
          <Button disabled={page >= totalPages} variant="outline" onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next</Button>
        </div>
      </div>
      {activeConversation ? (
        <ConversationThread
          contactName={activeConversation.connection?.displayName ?? activeConversation.fromNumber}
          phoneNumber={activeConversation.fromNumber}
          messages={threadMessages}
          onBack={() => setActiveConversation(null)}
        />
      ) : null}
    </div>
  );
}
