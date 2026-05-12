// FILE: src/components/dashboard/DashboardPageClient.tsx
"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: The v2 dashboard is a command center with one hero action, recent
 * conversations, and a drawer for all secondary assistant controls.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";

import { AIToggle } from "@/components/ai/AIToggle";
import { ConversationCard } from "@/components/conversations/ConversationCard";
import { ConversationThread } from "@/components/conversations/ConversationThread";
import { CustomizeDrawer, type CustomizeDrawerValues } from "@/components/customize/CustomizeDrawer";
import { MockMessageSender } from "@/components/messages/MockMessageSender";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useMessages, type MessageRecord } from "@/hooks/useMessages";
import { useSettings, useUpdateSettings, type SettingsRecord } from "@/hooks/useSettings";
import { useSubscription } from "@/hooks/useSubscription";
import type { UpdateSettingsInput } from "@/lib/validators/settings";
import { useAuthStore } from "@/store/authStore";

type DashboardPageClientProps = {
  mockMode: boolean;
};

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
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

export function DashboardPageClient({ mockMode }: DashboardPageClientProps) {
  const router = useRouter();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const settingsResult = useSettings();
  const subscription = useSubscription();
  const messagesResult = useMessages({ page: 1, limit: 20 });
  const updateSettings = useUpdateSettings();
  const [activeConversation, setActiveConversation] = useState<MessageRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerValues, setDrawerValues] = useState<CustomizeDrawerValues | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settingsResult.settings) {
      setDrawerValues(makeDrawerValues(settingsResult.settings));
      setDirty(false);
    }
  }, [settingsResult.settings]);

  const threadMessages = useMemo(() => {
    if (!activeConversation) {
      return [];
    }

    const phone = activeConversation.fromNumber;
    return messagesResult.messages.filter((message) => message.fromNumber === phone || message.toNumber === phone);
  }, [activeConversation, messagesResult.messages]);

  if (settingsResult.isLoading || messagesResult.isLoading) {
    return <div className="mx-auto max-w-[480px] px-4 pt-6"><Skeleton className="h-[520px] w-full" /></div>;
  }

  if (settingsResult.error || messagesResult.error || !settingsResult.settings) {
    return (
      <div className="mx-auto max-w-[480px] px-4 pt-6">
        <Alert>
          <AlertTitle>Dashboard unavailable</AlertTitle>
          <AlertDescription>Refresh after checking your session.</AlertDescription>
        </Alert>
      </div>
    );
  }

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

    if (subscription.canUseCustomPrompt) {
      payload.systemPrompt = drawerValues.systemPrompt;
    }

    updateSettings.mutate(payload);
    setDirty(false);
  }

  function updateDrawer(values: Partial<CustomizeDrawerValues>) {
    setDrawerValues((current) => (current ? { ...current, ...values } : current));
    setDirty(true);
  }

  const recentMessages = messagesResult.messages.slice(0, 3);

  return (
    <div className="relative mx-auto max-w-[480px] px-4 pb-8 pt-6">
      <AIToggle enabled={settingsResult.settings.autoReplyEnabled} />
      <section className="mt-8">
        <header className="mb-4 flex items-center justify-between">
          <span className="text-label font-medium uppercase tracking-widest text-wa-gray-400">Recent conversations</span>
          <Link href="/messages" className="text-body-sm text-wa-blue-600">View all</Link>
        </header>
        <div className="overflow-hidden rounded-xl border border-wa-gray-100 bg-white">
          {recentMessages.length > 0 ? recentMessages.map((message) => (
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
          )) : (
            <div className="p-5 text-center text-body text-wa-gray-600">No messages yet</div>
          )}
        </div>
      </section>
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="mt-4 flex h-[54px] w-full items-center justify-center gap-2 rounded-xl border border-wa-gray-100 bg-white text-body font-medium text-wa-gray-600 transition-all duration-150 hover:border-wa-gray-200 hover:bg-wa-gray-50 active:scale-[0.98]"
      >
        <SlidersHorizontal className="size-4" aria-hidden="true" />
        Customize assistant
      </button>
      {mockMode ? <div className="mt-4"><MockMessageSender onSent={() => void messagesResult.refetch()} /></div> : null}
      {activeConversation ? (
        <ConversationThread
          contactName={activeConversation.connection?.displayName ?? activeConversation.fromNumber}
          phoneNumber={activeConversation.fromNumber}
          messages={threadMessages}
          onBack={() => setActiveConversation(null)}
        />
      ) : null}
      {drawerValues ? (
        <CustomizeDrawer
          dirty={dirty}
          canEditCustomPrompt={subscription.canUseCustomPrompt}
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
