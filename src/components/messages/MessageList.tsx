"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: The inbox is now an operational workspace, not a dashboard page.
 * It mirrors modern shared-inbox products: conversation queue, live thread,
 * and compact tools rail in one stable surface.
 */
import { useDeferredValue, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Bot,
  Clock3,
  Inbox,
  MessageSquareText,
  MoreHorizontal,
  Search,
  Settings2,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";

import { ChannelIcon } from "@/components/icons/ChannelIcons";
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
type SimpleFilter = "ALL" | "UNANSWERED" | "HANDOFF" | "TODAY";
type ConnectionFilter = "ALL" | string;
type ChannelFilter = "all" | "whatsapp" | "instagram" | "messenger";

const channelOptions: Array<{ value: ChannelFilter; label: string }> = [
  { value: "all", label: "الكل" },
  { value: "whatsapp", label: "واتساب" },
  { value: "instagram", label: "إنستجرام" },
  { value: "messenger", label: "ماسنجر" },
];

const queueFilters: Array<{ value: SimpleFilter; label: string }> = [
  { value: "ALL", label: "الكل" },
  { value: "UNANSWERED", label: "لم يتم الرد" },
  { value: "HANDOFF", label: "تدخل بشري" },
  { value: "TODAY", label: "اليوم" },
];

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("ar-EG", { day: "numeric", hour: "2-digit", minute: "2-digit", month: "short" }).format(new Date(value));
}

function isToday(value: string) {
  const date = new Date(value);
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

function getCustomerPhone(message: MessageRecord) {
  return message.direction === "OUTBOUND" ? message.toNumber : message.fromNumber;
}

function getConversationKey(message: MessageRecord) {
  return `${message.connectionId}:${getCustomerPhone(message)}`;
}

export function MessageList() {
  const [page, setPage] = useState(1);
  const [direction] = useState<DirectionOption>("ALL");
  const [status, setStatus] = useState<StatusOption>("ALL");
  const [simpleFilter, setSimpleFilter] = useState<SimpleFilter>("ALL");
  const [connectionFilter, setConnectionFilter] = useState<ConnectionFilter>("ALL");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [activeConversation, setActiveConversation] = useState<MessageRecord | null>(null);
  const limit = 20;
  const messagesResult = useMessages({
    page,
    limit,
    channel: channelFilter === "all" ? undefined : channelFilter,
    connectionId: connectionFilter === "ALL" ? undefined : connectionFilter,
    direction: direction === "ALL" ? undefined : direction,
    status: status === "ALL" ? undefined : status,
  });
  const connectionOptionsResult = useMessages({ page: 1, limit: 100, channel: channelFilter === "all" ? undefined : channelFilter });
  const totalPages = Math.max(1, Math.ceil(messagesResult.total / limit));
  const connectionOptions = useMemo(() => {
    const options = new Map<string, string>();

    for (const message of connectionOptionsResult.messages) {
      options.set(message.connectionId, message.connection?.displayName ?? message.connection?.phoneNumberId ?? "قناة متصلة");
    }

    return Array.from(options, ([id, label]) => ({ id, label }));
  }, [connectionOptionsResult.messages]);

  const filteredMessages = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();

    return messagesResult.messages.filter((message) => {
      const matchesSimpleFilter =
        simpleFilter === "ALL" ||
        (simpleFilter === "UNANSWERED" && message.status === "RECEIVED") ||
        (simpleFilter === "HANDOFF" && Boolean(message.handoffActive)) ||
        (simpleFilter === "TODAY" && isToday(message.createdAt));
      const matchesSearch =
        !normalizedSearch ||
        [message.bodyText, message.aiReplyText, message.fromNumber, message.toNumber, message.senderName]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch));

      return matchesSimpleFilter && matchesSearch;
    });
  }, [deferredSearch, messagesResult.messages, simpleFilter]);

  const selectedConversation = useMemo(() => {
    if (!activeConversation) {
      return filteredMessages[0] ?? null;
    }

    return filteredMessages.some((message) => getConversationKey(message) === getConversationKey(activeConversation))
      ? activeConversation
      : filteredMessages[0] ?? null;
  }, [activeConversation, filteredMessages]);

  const threadMessages = useMemo(() => {
    if (!selectedConversation) {
      return [];
    }

    const key = getConversationKey(selectedConversation);
    return messagesResult.messages.filter((message) => getConversationKey(message) === key);
  }, [selectedConversation, messagesResult.messages]);

  const unansweredCount = messagesResult.messages.filter((message) => message.status === "RECEIVED").length;
  const aiRepliesCount = messagesResult.messages.filter((message) => message.status === "REPLIED" && Boolean(message.aiReplyText)).length;
  const failedCount = messagesResult.messages.filter((message) => message.status === "FAILED").length;
  const handoffCount = messagesResult.messages.filter((message) => message.handoffActive).length;
  const todayCount = messagesResult.messages.filter((message) => isToday(message.createdAt)).length;

  return (
    <div className="h-[calc(100vh-7.75rem)] min-h-[720px] p-2 sm:p-3 lg:p-4">
      <section
        dir="ltr"
        className="grid h-full min-h-0 overflow-hidden rounded-[28px] border border-white/70 bg-white/68 shadow-[0_24px_80px_rgba(4,44,83,0.14)] backdrop-blur-2xl lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[372px_minmax(0,1fr)_76px]"
      >
        <aside dir="rtl" className="flex min-h-0 flex-col border-b border-wa-gray-100/80 bg-white/64 lg:border-b-0 lg:border-l">
          <header className="shrink-0 border-b border-wa-gray-100/80 px-3 py-3 sm:px-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-body font-semibold text-wa-gray-900">المحادثات</h1>
                <p className="mt-0.5 text-label font-semibold uppercase tracking-widest text-wa-gray-400">
                  WhatsApp · Instagram · Messenger
                </p>
              </div>
              <div className="flex items-center rounded-full border border-wa-gray-100 bg-white p-1 text-body-sm font-semibold text-wa-gray-600">
                <button
                  className={cn("rounded-full px-3 py-1.5", simpleFilter === "ALL" ? "bg-wa-blue-50 text-wa-blue-700" : "text-wa-gray-500")}
                  type="button"
                  onClick={() => {
                    setSimpleFilter("ALL");
                    setStatus("ALL");
                    setPage(1);
                  }}
                >
                  Chats
                </button>
                <button
                  className={cn("rounded-full px-3 py-1.5", simpleFilter === "UNANSWERED" ? "bg-wa-blue-50 text-wa-blue-700" : "text-wa-gray-500")}
                  type="button"
                  onClick={() => {
                    setSimpleFilter("UNANSWERED");
                    setStatus("RECEIVED");
                    setPage(1);
                  }}
                >
                  Unreplied
                </button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-2">
              <span className="inline-flex min-h-9 items-center justify-center rounded-full border border-wa-gray-100 bg-white px-3 text-body-sm font-semibold text-wa-gray-700">
                المفتوحة · الأحدث
              </span>
              <span className="rounded-full bg-wa-blue-600 px-2.5 py-1 text-label font-semibold text-white">
                {unansweredCount}
              </span>
            </div>

            <div className="relative mt-3">
              <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-wa-gray-400" aria-hidden="true" />
              <Input
                className="h-10 rounded-2xl border-white/70 bg-white/78 pr-9 text-body-sm shadow-none"
                placeholder="بحث في العملاء أو الرسائل"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
              {queueFilters.map((chip) => (
                <FilterChip
                  key={chip.value}
                  active={simpleFilter === chip.value}
                  label={chip.label}
                  onClick={() => {
                    setSimpleFilter(chip.value);
                    setStatus(chip.value === "UNANSWERED" ? "RECEIVED" : "ALL");
                    setPage(1);
                  }}
                />
              ))}
            </div>

            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
              {channelOptions.map((option) => {
                const active = channelFilter === option.value;
                const channel = option.value === "all" ? null : option.value;

                return (
                  <FilterChip
                    key={option.value}
                    active={active}
                    icon={channel ? <ChannelIcon channel={channel} className="size-3.5" /> : undefined}
                    label={option.label}
                    onClick={() => {
                      setChannelFilter(option.value);
                      setConnectionFilter("ALL");
                      setActiveConversation(null);
                      setPage(1);
                    }}
                  />
                );
              })}
            </div>

            {connectionOptions.length > 1 ? (
              <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
                <FilterChip
                  active={connectionFilter === "ALL"}
                  label="كل القنوات"
                  onClick={() => {
                    setConnectionFilter("ALL");
                    setActiveConversation(null);
                    setPage(1);
                  }}
                />
                {connectionOptions.map((option) => (
                  <FilterChip
                    key={option.id}
                    active={connectionFilter === option.id}
                    label={option.label}
                    onClick={() => {
                      setConnectionFilter(option.id);
                      setActiveConversation(null);
                      setPage(1);
                    }}
                  />
                ))}
              </div>
            ) : null}
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {messagesResult.isLoading ? (
              <div className="space-y-2.5 p-3">
                {Array.from({ length: 8 }, (_, index) => (
                  <Skeleton key={index} className="h-[86px] w-full rounded-2xl" />
                ))}
              </div>
            ) : messagesResult.error ? (
              <div className="p-4">
                <Alert>
                  <AlertTitle>تعذر تحميل الرسائل</AlertTitle>
                  <AlertDescription>{messagesResult.error.message}</AlertDescription>
                </Alert>
              </div>
            ) : filteredMessages.length === 0 ? (
              <InboxEmptyState
                title={search || simpleFilter !== "ALL" ? "لا توجد محادثات مطابقة" : "لا توجد رسائل بعد"}
                body={search || simpleFilter !== "ALL" ? "غيّر البحث أو الفلتر لعرض محادثات أكثر." : "رسائل واتساب وإنستجرام وماسنجر ستظهر هنا."}
              />
            ) : (
              filteredMessages.map((message) => (
                <ConversationCard
                  key={message.id}
                  aiGenerated={message.status === "REPLIED" && Boolean(message.aiReplyText)}
                  className="min-h-[88px] bg-transparent px-3 py-3 hover:bg-white/76 sm:min-h-[92px] sm:px-3"
                  contactName={message.senderName ?? message.connection?.displayName}
                  channel={message.channel}
                  failed={message.status === "FAILED"}
                  handoff={message.handoffActive}
                  resolved={Boolean(message.resolvedAt)}
                  rating={message.rating}
                  socialIntent={message.socialIntent}
                  phoneNumber={getCustomerPhone(message)}
                  preview={
                    message.status === "FAILED"
                      ? message.aiReplyText ?? "لم يتم إرسال الرد. افتحي المحادثة لمعرفة المطلوب."
                      : message.aiReplyText ?? message.bodyText
                  }
                  timestamp={formatTimestamp(message.createdAt)}
                  unread={message.status === "RECEIVED"}
                  selected={selectedConversation?.id === message.id}
                  onClick={() => setActiveConversation(message)}
                />
              ))
            )}
          </div>

          <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-wa-gray-100/80 bg-white/74 px-3 py-2 text-label font-semibold text-wa-gray-500">
            <span>
              صفحة {page} / {totalPages}
              {messagesResult.query.isFetching ? <span className="mr-2 text-wa-blue-600">تحديث</span> : null}
            </span>
            <div className="flex gap-1.5">
              <Button disabled={page <= 1} size="sm" variant="outline" onClick={() => setPage((value) => Math.max(1, value - 1))}>
                السابق
              </Button>
              <Button disabled={page >= totalPages} size="sm" variant="outline" onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
                التالي
              </Button>
            </div>
          </footer>
        </aside>

        <main dir="rtl" className="flex min-h-0 flex-col bg-white/42">
          {selectedConversation ? (
            <ConversationThread
              className="min-h-0"
              connectionId={selectedConversation.connectionId}
              channel={selectedConversation.channel}
              contactName={selectedConversation.senderName ?? selectedConversation.connection?.displayName ?? getCustomerPhone(selectedConversation)}
              channelAccountName={
                selectedConversation.channel === "instagram"
                  ? selectedConversation.connection?.instagramUsername
                    ? `@${selectedConversation.connection.instagramUsername}`
                    : null
                  : selectedConversation.channel === "messenger"
                    ? selectedConversation.connection?.facebookPageName ?? null
                    : selectedConversation.connection?.displayName ?? null
              }
              handoffActive={Boolean(selectedConversation.handoffActive)}
              rating={selectedConversation.rating}
              ratingRequestedAt={selectedConversation.ratingRequestedAt}
              resolvedAt={selectedConversation.resolvedAt}
              phoneNumber={getCustomerPhone(selectedConversation)}
              threadId={selectedConversation.id}
              messages={threadMessages}
              onBack={() => setActiveConversation(null)}
              onSent={() => messagesResult.refetch().then(() => undefined)}
              onThreadUpdated={(updates) => {
                setActiveConversation((current) => (current ? { ...current, ...updates } : current));
              }}
              variant="inline"
            />
          ) : (
            <EmptyConversation />
          )}
        </main>

        <aside dir="rtl" className="hidden min-h-0 flex-col items-center gap-2 border-r border-wa-gray-100/80 bg-white/58 px-2 py-4 xl:flex">
          <ToolButton icon={<UserRound />} label="بيانات العميل" />
          <ToolButton icon={<Bot />} label="AI Assist" active />
          <ToolButton icon={<Clock3 />} label="السجل" />
          <ToolButton icon={<ShieldCheck />} label="الجودة" tone={failedCount > 0 ? "danger" : "default"} />
          <ToolButton icon={<Settings2 />} label="إعدادات القنوات" href="/connect" />
          <div className="mt-auto flex flex-col items-center gap-2">
            <RailMetric label="اليوم" value={todayCount} />
            <RailMetric label="AI" value={aiRepliesCount} />
            <RailMetric label="بشري" value={handoffCount} />
            <ToolButton icon={<MoreHorizontal />} label="المزيد" />
          </div>
        </aside>
      </section>
    </div>
  );
}

function FilterChip({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon?: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-label font-semibold transition",
        active
          ? "border-wa-blue-200 bg-wa-blue-50 text-wa-blue-800 shadow-[0_8px_20px_rgba(26,86,255,0.08)]"
          : "border-wa-gray-100 bg-white/74 text-wa-gray-600 hover:bg-white",
      )}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

function InboxEmptyState({ body, title }: { body: string; title: string }) {
  return (
    <div className="flex h-full min-h-[320px] flex-col items-center justify-center p-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-wa-blue-50">
        <Inbox className="size-6 text-wa-blue-600" aria-hidden="true" />
      </div>
      <p className="mt-4 text-body font-semibold text-wa-gray-900">{title}</p>
      <p className="mt-2 max-w-[300px] text-body-sm leading-6 text-wa-gray-600">{body}</p>
    </div>
  );
}

function EmptyConversation() {
  return (
    <div className="flex h-full min-h-[360px] flex-col items-center justify-center p-8 text-center">
      <div className="flex size-16 items-center justify-center rounded-[24px] bg-white text-wa-blue-600 shadow-[0_16px_42px_rgba(4,44,83,0.08)]">
        <MessageSquareText className="size-7" aria-hidden="true" />
      </div>
      <h2 className="mt-5 text-h2 font-semibold text-wa-gray-900">اختر محادثة للمتابعة</h2>
      <p className="mt-2 max-w-[420px] text-body-sm leading-6 text-wa-gray-600">
        افتح محادثة من القائمة لمراجعة رد المساعد، التسليم للبشر، أو إرسال رد يدوي.
      </p>
    </div>
  );
}

function ToolButton({
  active = false,
  href,
  icon,
  label,
  tone = "default",
}: {
  active?: boolean;
  href?: string;
  icon: ReactNode;
  label: string;
  tone?: "danger" | "default";
}) {
  const className = cn(
    "flex size-11 items-center justify-center rounded-[17px] border text-wa-gray-500 transition hover:bg-white hover:text-wa-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wa-blue-600 [&>svg]:size-5",
    active
      ? "border-wa-blue-100 bg-wa-blue-50 text-wa-blue-700 shadow-[0_12px_28px_rgba(26,86,255,0.10)]"
      : tone === "danger"
        ? "border-wa-error-bg bg-wa-error-bg/70 text-wa-error"
        : "border-wa-gray-100 bg-white/70",
  );

  if (href) {
    return (
      <Link href={href} className={className} title={label} aria-label={label}>
        {icon}
      </Link>
    );
  }

  return (
    <button type="button" className={className} title={label} aria-label={label}>
      {icon}
    </button>
  );
}

function RailMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="w-full rounded-2xl border border-wa-gray-100 bg-white/70 px-2 py-2 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-wa-gray-400">{label}</p>
      <p className="mt-0.5 text-body-sm font-semibold text-wa-gray-900">{value}</p>
    </div>
  );
}
