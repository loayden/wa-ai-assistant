// FILE: src/components/dashboard/DashboardPageClient.tsx
"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: The v2 dashboard is a command center with one hero action, recent
 * conversations, and a drawer for all secondary assistant controls.
 */
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Clock3,
  CreditCard,
  AlertCircle,
  MessageSquareText,
  RadioTower,
  ShieldCheck,
  SlidersHorizontal,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { AIToggle } from "@/components/ai/AIToggle";
import { ConversationCard } from "@/components/conversations/ConversationCard";
import { ConversationThread } from "@/components/conversations/ConversationThread";
import { CustomizeDrawer, type CustomizeDrawerValues } from "@/components/customize/CustomizeDrawer";
import { MockMessageSender } from "@/components/messages/MockMessageSender";
import { useUpdateSettings, type SettingsRecord } from "@/hooks/useSettings";
import type { MessageRecord } from "@/hooks/useMessages";
import type { UpdateSettingsInput } from "@/lib/validators/settings";
import { useAuthStore } from "@/store/authStore";
import type { SettingsResponse } from "@/types/api";
import type { WhatsAppConnectionSummary } from "@/components/whatsapp/ConnectionStatus";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PLAN_LIMITS } from "@/types/subscription";
import { cn } from "@/lib/utils";

type DashboardPageClientProps = {
  initialConnection: WhatsAppConnectionSummary | null;
  initialMessages: MessageRecord[];
  initialSettings: SettingsResponse["settings"];
  initialUser: SettingsResponse["user"];
  mockMode: boolean;
};

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}

function isToday(value: string) {
  return new Date(value).toDateString() === new Date().toDateString();
}

function makeDrawerValues(settings: SettingsRecord): CustomizeDrawerValues {
  return {
    tone: "friendly",
    businessName: settings.businessName ?? "",
    businessContext: settings.businessContext ?? "",
    language: settings.language,
    fallbackMessage: settings.fallbackMessage ?? "",
    systemPrompt: settings.systemPrompt,
    largeTextEnabled: false,
  };
}

export function DashboardPageClient({
  initialConnection,
  initialMessages,
  initialSettings,
  initialUser,
  mockMode,
}: DashboardPageClientProps) {
  const router = useRouter();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const updateSettings = useUpdateSettings();
  const [settings, setSettings] = useState(initialSettings);
  const [user] = useState(initialUser);
  const [messages] = useState(initialMessages);
  const [connection] = useState(initialConnection);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(initialSettings.autoReplyEnabled);
  const [activeConversation, setActiveConversation] = useState<MessageRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerValues, setDrawerValues] = useState<CustomizeDrawerValues | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDrawerValues(makeDrawerValues(settings));
    setDirty(false);
  }, [settings]);

  const threadMessages = useMemo(() => {
    if (!activeConversation) {
      return [];
    }

    const phone = activeConversation.fromNumber;
    return messages.filter((message) => message.fromNumber === phone || message.toNumber === phone);
  }, [activeConversation, messages]);

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    clearAuth();
    router.push("/login");
    router.refresh();
  }

  function saveDrawer() {
    if (!drawerValues) {
      return;
    }

    const payload: UpdateSettingsInput = {
      businessName: drawerValues.businessName || null,
      businessContext: drawerValues.businessContext || null,
      fallbackMessage: drawerValues.fallbackMessage || null,
      language: drawerValues.language,
    };

    if (user.planTier !== "FREE") {
      payload.systemPrompt = drawerValues.systemPrompt;
    }

    updateSettings.mutate(payload, {
      onSuccess: (response) => {
        setSettings(response.settings);
        setAutoReplyEnabled(response.settings.autoReplyEnabled);
        setDrawerValues(makeDrawerValues(response.settings));
        setDirty(false);
        toast.success("Assistant updated", {
          description: "Your reply behavior is saved.",
        });
      },
      onError: (error) => {
        toast.error("Settings were not saved", {
          description: error instanceof Error ? error.message : "Please try again.",
        });
      },
    });
  }

  function updateDrawer(values: Partial<CustomizeDrawerValues>) {
    setDrawerValues((current) => (current ? { ...current, ...values } : current));
    setDirty(true);
  }

  const recentMessages = messages.slice(0, 5);
  const unansweredCount = messages.filter((message) => message.status === "RECEIVED").length;
  const failedCount = messages.filter((message) => message.status === "FAILED").length;
  const todayCount = messages.filter((message) => isToday(message.createdAt)).length;
  const inboundCount = messages.filter((message) => message.direction === "INBOUND").length;
  const planLimit = PLAN_LIMITS[user.planTier].includedRepliesPerMonth;
  const usagePercent = Math.min(100, Math.round((user.monthlyReplyCount / planLimit) * 100));
  const connected = Boolean(connection?.isActive);
  const lastMessage = messages[0] ?? null;
  const ready = connected && autoReplyEnabled;

  return (
    <div className="relative mx-auto max-w-[1120px] px-3 pb-8 pt-4 sm:px-6 lg:pt-10">
      <section className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-[22px] border border-wa-gray-100 bg-white shadow-[0_18px_56px_rgba(13,20,33,0.05)] sm:rounded-[28px]">
          <div className="border-b border-wa-gray-100 bg-[linear-gradient(135deg,#ffffff_0%,#f6f8ff_100%)] p-4 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label={ready ? "Live" : connected ? "Ready to resume" : "Setup needed"} variant={ready ? "active" : connected ? "paused" : "error"} className="px-2.5 py-1 sm:px-3" />
              <span className="rounded-full border border-wa-gray-100 bg-white px-3 py-1 text-label font-semibold uppercase tracking-widest text-wa-gray-500">
                {user.planTier} plan
              </span>
            </div>
            <div className="mt-5 max-w-[680px] sm:mt-8">
              <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">Command center</p>
              <h1 className="mt-2 text-[28px] font-semibold leading-tight text-wa-gray-900 sm:mt-3 sm:text-[46px]">
                {ready ? "Your assistant is replying to customers." : connected ? "Your number is connected. AI is paused." : "Connect WhatsApp to start replying."}
              </h1>
              <p className="mt-3 max-w-[620px] text-body-sm leading-6 text-wa-gray-600 sm:mt-4 sm:text-body-lg">
                Control live replies, check the WhatsApp connection, review recent conversations, and adjust the assistant without leaving this screen.
              </p>
            </div>
            <div className="mt-5 flex flex-col gap-2 sm:mt-7 sm:flex-row sm:gap-3">
              <Button className="rounded-full" onClick={() => setDrawerOpen(true)}>
                <SlidersHorizontal className="size-4" aria-hidden="true" />
                Customize assistant
              </Button>
              <Button className="rounded-full" variant="outline" onClick={() => router.push(connected ? "/messages" : "/whatsapp")}>
                {connected ? "Open inbox" : "Finish WhatsApp setup"}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
          <div className="grid gap-0 divide-y divide-wa-gray-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <CommandSignal
              icon={<Zap className="size-4 text-wa-blue-600" aria-hidden="true" />}
              label="AI replies"
              value={autoReplyEnabled ? "On" : "Paused"}
              detail={autoReplyEnabled ? "Automatic replies are enabled" : "Customers will wait for manual review"}
            />
            <CommandSignal
              icon={<RadioTower className="size-4 text-wa-success" aria-hidden="true" />}
              label="WhatsApp"
              value={connected ? "Connected" : "Not connected"}
              detail={connected ? connection?.displayName ?? "Business number ready" : "Setup must be completed first"}
            />
            <CommandSignal
              icon={<Clock3 className="size-4 text-wa-gray-500" aria-hidden="true" />}
              label="Last activity"
              value={lastMessage ? formatTimestamp(lastMessage.createdAt) : "No messages"}
              detail={lastMessage ? formatDate(lastMessage.createdAt) : "New messages will appear here"}
            />
          </div>
        </div>

        <div className="space-y-4">
          <AIToggle enabled={autoReplyEnabled} onOptimisticChange={setAutoReplyEnabled} className="rounded-[22px] shadow-[0_18px_56px_rgba(13,20,33,0.05)] sm:rounded-[28px]" />
          <section className="rounded-[22px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px] sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">Reply usage</p>
                <p className="mt-1 text-h3 font-semibold text-wa-gray-900 sm:text-h2">
                  {user.monthlyReplyCount.toLocaleString()} / {planLimit.toLocaleString()}
                </p>
              </div>
              <CreditCard className="size-4 text-wa-blue-600 sm:size-5" aria-hidden="true" />
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-wa-gray-100">
              <div className="h-full rounded-full bg-wa-blue-600" style={{ width: `${usagePercent}%` }} />
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 text-body-sm text-wa-gray-600">
              <span>{usagePercent}% used this month</span>
              <Link href="/billing" className="font-semibold text-wa-blue-600 hover:underline">
                View plan
              </Link>
            </div>
          </section>
        </div>
      </section>

      <section className="mt-4 grid gap-2 sm:mt-5 sm:gap-3 md:grid-cols-4">
        <DashboardStatusCard
          label={failedCount > 0 ? "Needs setup" : "Needs review"}
          value={String(failedCount > 0 ? failedCount : unansweredCount)}
          hint={
            failedCount > 0
              ? "A reply could not be sent. Check setup before inviting customers."
              : unansweredCount > 0
                ? "Customer messages waiting in the inbox"
                : "No customer messages need action"
          }
          icon={
            failedCount > 0 ? (
              <AlertCircle className="size-4 text-wa-error" aria-hidden="true" />
            ) : (
              <MessageSquareText className="size-4 text-wa-blue-600" aria-hidden="true" />
            )
          }
        />
        <DashboardStatusCard
          label="Today"
          value={String(todayCount)}
          hint="Messages received or sent today"
          icon={<Clock3 className="size-4 text-wa-gray-500" aria-hidden="true" />}
        />
        <DashboardStatusCard
          label="Inbound"
          value={String(inboundCount)}
          hint="Customer messages captured for this account"
          icon={<MessageSquareText className="size-4 text-wa-gray-500" aria-hidden="true" />}
        />
        <DashboardStatusCard
          label="Security"
          value={connected ? "Verified" : "Pending"}
          hint={connected ? "Connection details are saved securely" : "Connect WhatsApp to verify credentials"}
          icon={<ShieldCheck className="size-4 text-wa-success" aria-hidden="true" />}
        />
      </section>

      <section className="mt-5 grid gap-4 sm:mt-6 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-[22px] border border-wa-gray-100 bg-white shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px]">
          <header className="flex items-center justify-between gap-3 border-b border-wa-gray-100 p-4 sm:gap-4 sm:p-6">
            <div>
              <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">Recent conversations</p>
              <h2 className="mt-1 text-h3 font-semibold text-wa-gray-900 sm:text-h2">Latest customer messages</h2>
            </div>
            <Link href="/messages" className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-wa-gray-100 px-3 text-body-sm font-semibold text-wa-blue-600 transition hover:bg-wa-blue-50 sm:min-h-10 sm:gap-2 sm:px-4">
              View all
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </header>
          {recentMessages.length > 0 ? (
            recentMessages.map((message) => (
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
          ) : (
            <EmptyState
              icon={<MessageSquareText className="size-6 text-wa-blue-600" aria-hidden="true" />}
              title="No conversations yet"
              body="When customers message your connected WhatsApp number, their conversations will appear here for review."
              actionLabel={connected ? "Open inbox" : "Connect WhatsApp"}
              onAction={() => router.push(connected ? "/messages" : "/whatsapp")}
            />
          )}
        </div>

        <aside className="space-y-4">
          <section className="rounded-[22px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px] sm:p-5">
            <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">Next best action</p>
            <div className="mt-3 space-y-2.5 sm:mt-4 sm:space-y-3">
              <NextStepRow
                done={connected}
                icon={<RadioTower className="size-4" aria-hidden="true" />}
                title="Connect WhatsApp"
                body={connected ? "The business number is connected." : "Finish the guided API setup before replies can run."}
                href="/whatsapp"
              />
              <NextStepRow
                done={autoReplyEnabled}
                icon={<Bot className="size-4" aria-hidden="true" />}
                title="Turn on AI replies"
                body={autoReplyEnabled ? "AI replies are enabled." : "Use the main toggle when you are ready."}
                href="/dashboard"
              />
              <NextStepRow
                done={Boolean(settings.businessContext)}
                icon={<SlidersHorizontal className="size-4" aria-hidden="true" />}
                title="Add business context"
                body={settings.businessContext ? "The assistant has business context." : "Add services, hours, policies, and tone."}
                onClick={() => setDrawerOpen(true)}
              />
            </div>
          </section>

          {mockMode ? (
            <div className="rounded-[22px] border border-wa-gray-100 bg-white p-3 shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px] sm:p-4">
              <MockMessageSender onSent={() => router.refresh()} />
            </div>
          ) : null}
        </aside>
      </section>
      {activeConversation ? (
        <ConversationThread
          connectionId={activeConversation.connectionId}
          contactName={activeConversation.connection?.displayName ?? activeConversation.fromNumber}
          phoneNumber={activeConversation.fromNumber}
          messages={threadMessages}
          onBack={() => setActiveConversation(null)}
          onSent={() => router.refresh()}
        />
      ) : null}
      {drawerValues ? (
        <CustomizeDrawer
          dirty={dirty}
          canEditCustomPrompt={user.planTier !== "FREE"}
          isSaving={updateSettings.isPending}
          open={drawerOpen}
          values={drawerValues}
          onBilling={() => router.push("/billing")}
          onChange={updateDrawer}
          onClose={() => setDrawerOpen(false)}
          onSave={saveDrawer}
          onSignOut={handleSignOut}
        />
      ) : null}
    </div>
  );
}

function DashboardStatusCard({
  hint,
  icon,
  label,
  value,
}: {
  hint: string;
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-wa-gray-100 bg-white p-3 shadow-[0_10px_28px_rgba(13,20,33,0.035)] sm:rounded-[22px] sm:p-4">
      <div className="mb-3 flex size-9 items-center justify-center rounded-xl bg-wa-gray-50 sm:mb-4 sm:size-10 sm:rounded-2xl">{icon}</div>
      <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">{label}</p>
      <p className="mt-1 text-h3 font-semibold text-wa-gray-900 sm:text-h2">{value}</p>
      <p className="mt-1 text-body-sm leading-5 text-wa-gray-600">{hint}</p>
    </div>
  );
}

function CommandSignal({ detail, icon, label, value }: { detail: string; icon: ReactNode; label: string; value: string }) {
  return (
    <div className="p-4 sm:p-6">
      <div className="mb-3 flex size-9 items-center justify-center rounded-xl bg-wa-gray-50 sm:mb-4 sm:size-10 sm:rounded-2xl">{icon}</div>
      <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">{label}</p>
      <p className="mt-1 text-body font-semibold text-wa-gray-900">{value}</p>
      <p className="mt-1 text-body-sm leading-5 text-wa-gray-600">{detail}</p>
    </div>
  );
}

function EmptyState({
  actionLabel,
  body,
  icon,
  onAction,
  title,
}: {
  actionLabel: string;
  body: string;
  icon: ReactNode;
  onAction: () => void;
  title: string;
}) {
  return (
    <div className="p-6 text-center sm:p-10">
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-wa-blue-50 sm:size-14 sm:rounded-3xl">{icon}</div>
      <p className="mt-4 text-h3 font-semibold text-wa-gray-900">{title}</p>
      <p className="mx-auto mt-2 max-w-[420px] text-body-sm leading-6 text-wa-gray-600">{body}</p>
      <Button className="mt-4 rounded-full sm:mt-5" onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  );
}

function NextStepRow({
  body,
  done,
  href,
  icon,
  onClick,
  title,
}: {
  body: string;
  done: boolean;
  href?: string;
  icon: ReactNode;
  onClick?: () => void;
  title: string;
}) {
  const content = (
    <>
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl sm:size-10 sm:rounded-2xl", done ? "bg-wa-success-bg text-wa-success" : "bg-wa-blue-50 text-wa-blue-600")}>
        {done ? <BadgeCheck className="size-4" aria-hidden="true" /> : icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body-sm font-semibold text-wa-gray-900">{title}</span>
        <span className="mt-0.5 block text-body-sm leading-5 text-wa-gray-600">{body}</span>
      </span>
      {done ? null : <ArrowRight className="size-4 shrink-0 text-wa-gray-400" aria-hidden="true" />}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="flex items-start gap-2.5 rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-3 transition hover:bg-white sm:gap-3">
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className="flex w-full items-start gap-2.5 rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-3 text-left transition hover:bg-white sm:gap-3">
      {content}
    </button>
  );
}
