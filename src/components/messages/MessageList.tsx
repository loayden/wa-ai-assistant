// FILE: src/components/messages/MessageList.tsx
"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: The full inbox keeps the existing paginated API but replaces
 * backend-flavored tables with scan-friendly conversation cards.
 */
import { useDeferredValue, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Bot, CheckCircle2, Clock3, Inbox, MessageSquareText, Search, ShieldCheck, UserRoundCheck } from "lucide-react";
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

const channelOptions: Array<{ value: ChannelFilter; label: string }> = [
  { value: "all", label: "الكل" },
  { value: "whatsapp", label: "واتساب" },
  { value: "instagram", label: "إنستجرام" },
  { value: "messenger", label: "ماسنجر" },
];

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

    const key = getConversationKey(activeConversation);
    return messagesResult.messages.filter((message) => getConversationKey(message) === key);
  }, [activeConversation, messagesResult.messages]);

  const chips: Array<{ value: SimpleFilter; label: string }> = [
    { value: "ALL", label: "الكل" },
    { value: "UNANSWERED", label: "تحتاج رد" },
    { value: "HANDOFF", label: "تدخل بشري" },
    { value: "TODAY", label: "اليوم" },
  ];
  const unansweredCount = messagesResult.messages.filter((message) => message.status === "RECEIVED").length;
  const aiRepliesCount = messagesResult.messages.filter((message) => message.status === "REPLIED" && Boolean(message.aiReplyText)).length;
  const failedCount = messagesResult.messages.filter((message) => message.status === "FAILED").length;
  const handoffCount = messagesResult.messages.filter((message) => message.handoffActive).length;
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
              الرئيسية
            </Link>
            <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">الرسائل</p>
            <h1 className="mt-2 text-[28px] font-semibold leading-tight text-wa-gray-900 sm:mt-3 sm:text-[46px]">صندوق وارد واضح لمتابعة العملاء يوميًا.</h1>
            <p className="mt-3 text-body-sm leading-6 text-wa-gray-600 sm:mt-4 sm:text-body-lg">
              ابحثي في المحادثات، تابعي الرسائل التي تحتاج اهتمام، وافتحي أي محادثة بدون الخروج من صفحة العمل.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:w-[380px] lg:grid-cols-1">
            <InboxHeroStat label="المعروض" value={String(filteredMessages.length)} />
            <InboxHeroStat label="تحتاج رد" value={String(unansweredCount)} tone={unansweredCount > 0 ? "attention" : "calm"} />
            <InboxHeroStat label="تدخل بشري" value={String(handoffCount)} tone={handoffCount > 0 ? "attention" : "calm"} />
            <InboxHeroStat label="ردود AI" value={String(aiRepliesCount)} />
            {failedCount > 0 ? <InboxHeroStat label="تحتاج إعداد" value={String(failedCount)} tone="attention" /> : null}
          </div>
        </div>
      </header>

      <section className="grid gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-[22px] border border-wa-gray-100 bg-white shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px]">
          <div className="border-b border-wa-gray-100 p-4 sm:p-5">
            {connectionOptions.length > 1 ? (
              <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  className={cn(
                    "min-h-9 shrink-0 rounded-full border px-3 text-body-sm font-semibold transition-colors",
                    connectionFilter === "ALL"
                      ? "border-wa-blue-600 bg-wa-blue-50 text-wa-blue-800"
                      : "border-wa-gray-100 bg-white text-wa-gray-600 hover:bg-wa-gray-50",
                  )}
                  onClick={() => {
                    setConnectionFilter("ALL");
                    setActiveConversation(null);
                    setPage(1);
                  }}
                >
                  كل القنوات
                </button>
                {connectionOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={cn(
                      "min-h-9 shrink-0 rounded-full border px-3 text-body-sm font-semibold transition-colors",
                      connectionFilter === option.id
                        ? "border-wa-blue-600 bg-wa-blue-50 text-wa-blue-800"
                        : "border-wa-gray-100 bg-white text-wa-gray-600 hover:bg-wa-gray-50",
                    )}
                    onClick={() => {
                      setConnectionFilter(option.id);
                      setActiveConversation(null);
                      setPage(1);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {channelOptions.map((option) => {
                const active = channelFilter === option.value;
                const channel = option.value === "all" ? null : option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-body-sm font-semibold transition-colors",
                      active
                        ? "border-wa-blue-600 bg-wa-blue-50 text-wa-blue-800"
                        : "border-wa-gray-100 bg-white text-wa-gray-600 hover:bg-wa-gray-50",
                    )}
                    onClick={() => {
                      setChannelFilter(option.value);
                      setConnectionFilter("ALL");
                      setActiveConversation(null);
                      setPage(1);
                    }}
                  >
                    {channel ? <ChannelIcon channel={channel} className="size-4" /> : null}
                    {option.label}
                  </button>
                );
              })}
            </div>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="relative">
                <Search className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-wa-gray-400 sm:right-4" aria-hidden="true" />
                <Input
                  className="h-11 rounded-2xl bg-wa-gray-50 pr-10 sm:h-12 sm:pr-11"
                  placeholder="ابحثي بالرسالة أو رقم الهاتف أو اسم العميل"
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
                <AlertTitle>تعذر تحميل الرسائل</AlertTitle>
                <AlertDescription>{messagesResult.error.message}</AlertDescription>
              </Alert>
            </div>
          ) : filteredMessages.length === 0 ? (
            <InboxEmptyState
              title={search || simpleFilter !== "ALL" ? "لا توجد محادثات مطابقة" : "لا توجد رسائل بعد"}
              body={search || simpleFilter !== "ALL" ? "جرّبي بحثًا مختلفًا أو أزيلي الفلاتر لعرض محادثات أكثر." : "عندما يرسل العملاء إلى واتساب أو إنستجرام أو ماسنجر ستظهر المحادثات هنا."}
            />
          ) : (
            filteredMessages.map((message) => (
              <ConversationCard
                key={message.id}
                aiGenerated={message.status === "REPLIED" && Boolean(message.aiReplyText)}
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
                selected={activeConversation?.id === message.id}
                onClick={() => setActiveConversation(message)}
              />
            ))
          )}

          <div className="flex flex-col gap-3 border-t border-wa-gray-100 p-4 text-body-sm text-wa-gray-600 sm:flex-row sm:items-center sm:justify-between">
            <span>
              صفحة {page} من {totalPages}
              {messagesResult.query.isFetching ? <span className="mr-2 text-wa-blue-600">جارٍ التحديث...</span> : null}
            </span>
            <div className="flex gap-2">
              <Button disabled={page <= 1} size="sm" variant="outline" onClick={() => setPage((value) => Math.max(1, value - 1))}>
                السابق
              </Button>
              <Button disabled={page >= totalPages} size="sm" variant="outline" onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
                التالي
              </Button>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <section className="rounded-[22px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px] sm:p-5">
            <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">حالة الصندوق</p>
            <div className="mt-4 grid gap-3">
              <InboxHealthRow
                icon={<CheckCircle2 className="size-4" aria-hidden="true" />}
                label="اليوم"
                value={`${todayCount} رسالة`}
                tone={todayCount > 0 ? "blue" : "neutral"}
              />
              <InboxHealthRow
                icon={<Bot className="size-4" aria-hidden="true" />}
                label="مساعدة AI"
                value={`${aiRepliesCount} رد`}
                tone="blue"
              />
              <InboxHealthRow
                icon={<ShieldCheck className="size-4" aria-hidden="true" />}
                label="حالة المراجعة"
                value={failedCount > 0 ? `${failedCount} مشكلة إعداد` : handoffCount > 0 ? `${handoffCount} محادثة بشرية` : unansweredCount > 0 ? `${unansweredCount} تنتظر` : "واضح"}
                tone={failedCount > 0 || unansweredCount > 0 || handoffCount > 0 ? "attention" : "success"}
              />
              <InboxHealthRow
                icon={<UserRoundCheck className="size-4" aria-hidden="true" />}
                label="التدخل البشري"
                value={handoffCount > 0 ? `${handoffCount} نشطة` : "لا يوجد"}
                tone={handoffCount > 0 ? "attention" : "neutral"}
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
                  <p className="text-body-sm font-semibold text-wa-gray-900">الرد التلقائي يحتاج إعداد</p>
                  <p className="mt-2 text-body-sm leading-6 text-wa-gray-600">
                    وصلت رسالة العميل، لكن الرد توقف قبل الإرسال. افتحي المحادثة لمعرفة السبب المسجل في kallem.
                  </p>
                  <p className="mt-2 rounded-2xl bg-wa-gray-50 px-3 py-2 text-body-sm leading-6 text-wa-gray-600">
                    إذا كانت القناة ما زالت في وضع اختبار من Meta، فالردود مسموحة فقط لحسابات الاختبار المعتمدة.
                  </p>
                  <Link
                    href="/connect"
                    className="mt-3 inline-flex min-h-10 items-center justify-center rounded-full bg-wa-gray-900 px-4 text-body-sm font-semibold text-white transition hover:bg-wa-gray-700"
                  >
                    مراجعة الإعداد
                  </Link>
                </div>
              </div>
            </section>
          ) : null}

          <section className="rounded-[22px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px] sm:p-5">
            <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">طريقة العمل اليومية</p>
            <div className="mt-4 space-y-3">
              <WorkflowRow icon={<Inbox className="size-4" aria-hidden="true" />} title="راجعي الرسائل الجديدة" body="ابدئي بالمحادثات المعلّمة بأنها تحتاج رد." />
              <WorkflowRow icon={<MessageSquareText className="size-4" aria-hidden="true" />} title="افتحي المحادثة" body="راجعي رسالة العميل ورد AI في السياق الكامل." />
              <WorkflowRow icon={<Clock3 className="size-4" aria-hidden="true" />} title="تابعي يدويًا" body="ارسلي ردًا مباشرًا عندما يحتاج الأمر تدخل صاحب النشاط." />
            </div>
            <Link
              href="/connect"
              className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-wa-gray-200 text-body-sm font-semibold text-wa-gray-700 transition hover:bg-wa-gray-50 sm:mt-5 sm:min-h-11"
            >
              مراجعة إعداد القنوات
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </section>
        </aside>
      </section>
      {activeConversation ? (
        <ConversationThread
          connectionId={activeConversation.connectionId}
          channel={activeConversation.channel}
          contactName={activeConversation.senderName ?? activeConversation.connection?.displayName ?? getCustomerPhone(activeConversation)}
          channelAccountName={
            activeConversation.channel === "instagram"
              ? activeConversation.connection?.instagramUsername
                ? `@${activeConversation.connection.instagramUsername}`
                : null
              : activeConversation.channel === "messenger"
                ? activeConversation.connection?.facebookPageName ?? null
                : activeConversation.connection?.displayName ?? null
          }
          handoffActive={Boolean(activeConversation.handoffActive)}
          rating={activeConversation.rating}
          ratingRequestedAt={activeConversation.ratingRequestedAt}
          resolvedAt={activeConversation.resolvedAt}
          phoneNumber={getCustomerPhone(activeConversation)}
          threadId={activeConversation.id}
          messages={threadMessages}
          onBack={() => setActiveConversation(null)}
          onSent={() => messagesResult.refetch().then(() => undefined)}
          onThreadUpdated={(updates) => {
            setActiveConversation((current) => (current ? { ...current, ...updates } : current));
          }}
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
