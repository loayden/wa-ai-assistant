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
  CheckCircle2,
  CreditCard,
  AlertCircle,
  BookOpen,
  MessageSquareText,
  PhoneCall,
  RadioTower,
  Send,
  SlidersHorizontal,
  UserPlus,
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
  initialOnboarding: {
    completed: boolean;
    hasConnection: boolean;
    hasKnowledge: boolean;
  };
  initialSettings: SettingsResponse["settings"];
  initialUser: SettingsResponse["user"];
  initialMonthlyLeadsCount: number;
  mockMode: boolean;
};

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("ar-EG", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function isToday(value: string) {
  return new Date(value).toDateString() === new Date().toDateString();
}

function getTrialDaysRemaining(trialEndsAt: string | null) {
  if (!trialEndsAt) {
    return 0;
  }

  const remainingMs = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
}

function getCustomerPhone(message: MessageRecord) {
  return message.direction === "OUTBOUND" ? message.toNumber : message.fromNumber;
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
  initialOnboarding,
  initialSettings,
  initialUser,
  initialMonthlyLeadsCount,
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
  const [onboarding, setOnboarding] = useState(initialOnboarding);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDrawerValues(makeDrawerValues(settings));
    setDirty(false);
  }, [settings]);

  const threadMessages = useMemo(() => {
    if (!activeConversation) {
      return [];
    }

    const phone = getCustomerPhone(activeConversation);
    return messages.filter((message) => getCustomerPhone(message) === phone);
  }, [activeConversation, messages]);

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    clearAuth();
    router.push("/login");
    router.refresh();
  }

  async function skipOnboarding() {
    setOnboarding((current) => ({ ...current, completed: true }));

    try {
      await fetch("/api/onboarding", { method: "POST" });
      toast.success("تم تخطي الإعداد", {
        description: "تقدري تضيفي معلومات نشاطك في أي وقت من قاعدة المعرفة.",
      });
    } catch {
      setOnboarding(initialOnboarding);
      toast.error("تعذر تخطي الإعداد", {
        description: "جرّبي مرة أخرى.",
      });
    }
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
        toast.success("تم تحديث المساعد", {
          description: "تم حفظ طريقة الرد بنجاح.",
        });
      },
      onError: (error) => {
        toast.error("لم يتم حفظ الإعدادات", {
          description: error instanceof Error ? error.message : "جرّبي مرة أخرى.",
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
  const usageWarningVisible = usagePercent > 60;
  const trialDaysRemaining = getTrialDaysRemaining(user.trialEndsAt);
  const connected = Boolean(connection?.isActive);
  const possibleTestNumber = /test number/i.test(connection?.displayName ?? "");
  const lastMessage = messages[0] ?? null;
  const ready = connected && autoReplyEnabled;

  return (
    <div className="relative mx-auto max-w-[1180px] px-3 pb-8 pt-4 sm:px-6 lg:pt-8">
      {trialDaysRemaining > 0 ? (
        <section className="mb-4 rounded-[22px] border border-wa-blue-100 bg-white p-4 shadow-[0_14px_38px_rgba(26,86,255,0.06)] sm:mb-5 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:rounded-[28px]">
          <div>
            <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">تجربة Pro</p>
            <h2 className="mt-1 text-body font-semibold text-wa-gray-900">
              أنت في تجربة Pro المجانية. تنتهي بعد {trialDaysRemaining} {trialDaysRemaining === 1 ? "يوم" : "أيام"}.
            </h2>
            <p className="mt-1 text-body-sm leading-5 text-wa-gray-600">
              استخدمي الفترة دي لاختبار الردود، قاعدة المعرفة، والتحليلات قبل الدفع.
            </p>
          </div>
          <Link
            href="/billing"
            className="mt-3 inline-flex min-h-11 items-center justify-center rounded-full bg-wa-blue-600 px-5 text-body-sm font-semibold text-white transition hover:bg-wa-blue-700 sm:mt-0"
          >
            ترقية الآن
          </Link>
        </section>
      ) : null}
      {usageWarningVisible ? (
        <section
          className={cn(
            "mb-4 rounded-[22px] border bg-white p-4 shadow-[0_14px_38px_rgba(13,20,33,0.05)] sm:mb-5 sm:rounded-[28px]",
            usagePercent >= 80 ? "border-wa-error-bg" : "border-wa-warning-bg",
          )}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className={cn("text-label font-semibold uppercase tracking-widest", usagePercent >= 80 ? "text-wa-error" : "text-wa-warning")}>
                الردود الشهرية
              </p>
              <p className="mt-1 text-body font-semibold text-wa-gray-900">
                استخدمت {user.monthlyReplyCount.toLocaleString("ar-EG")} من {planLimit.toLocaleString("ar-EG")} رد هذا الشهر.
              </p>
              <div className="mt-3 h-2 max-w-[520px] overflow-hidden rounded-full bg-wa-gray-100">
                <div
                  className={cn("h-full rounded-full", usagePercent >= 80 ? "bg-wa-error" : "bg-wa-warning")}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>
            {usagePercent >= 80 ? (
              <Link
                href="/billing"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-wa-blue-600 px-5 text-body-sm font-semibold text-white transition hover:bg-wa-blue-700"
              >
                ترقية الآن
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}
      {!onboarding.completed ? (
        <OnboardingBanner
          hasConnection={onboarding.hasConnection || connected}
          hasKnowledge={onboarding.hasKnowledge}
          onSkip={skipOnboarding}
        />
      ) : null}
      <section className="overflow-hidden rounded-[24px] border border-wa-gray-100 bg-white shadow-[0_18px_60px_rgba(13,20,33,0.05)] sm:rounded-[32px]">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="border-b border-wa-gray-100 bg-[radial-gradient(circle_at_10%_0%,rgba(48,86,255,0.10),transparent_32%),linear-gradient(135deg,#ffffff_0%,#f7f9ff_100%)] p-4 sm:p-7 lg:border-b-0 lg:border-r lg:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                label={ready ? "المساعد يعمل" : connected ? "متصل ومتوقف" : "يحتاج إعداد"}
                variant={ready ? "active" : connected ? "paused" : "error"}
                className="px-2.5 py-1 sm:px-3"
              />
              {possibleTestNumber ? (
                <span className="rounded-full border border-wa-warning-bg bg-wa-warning-bg px-3 py-1 text-label font-semibold uppercase tracking-widest text-wa-warning">
                  رقم تجريبي
                </span>
              ) : null}
              <span className="rounded-full border border-wa-gray-100 bg-white px-3 py-1 text-label font-semibold uppercase tracking-widest text-wa-gray-500">
                قنوات السوشيال
              </span>
            </div>
            <div className="mt-5 max-w-[720px] sm:mt-8">
              <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">مركز التحكم</p>
              <h1 className="mt-2 text-[29px] font-semibold leading-[1.05] text-wa-gray-900 sm:mt-3 sm:text-[48px]">
                {ready
                  ? "كل رسائل السوشيال في صندوق واحد واضح."
                  : connected
                    ? "قناتك الأساسية متصلة. شغّلي الردود عندما تكوني جاهزة."
                    : "وصّلي قنواتك، واتركي kallem يرد على العملاء."}
              </h1>
              <p className="mt-3 max-w-[640px] text-body-sm leading-6 text-wa-gray-600 sm:mt-4 sm:text-body-lg">
                لوحة بسيطة للعمل اليومي: راقبي حالة الردود، افتحي آخر المحادثات، وعدّلي سلوك المساعد بدون إعدادات تقنية.
              </p>
            </div>
            <div className="mt-5 flex flex-col gap-2 sm:mt-7 sm:flex-row sm:gap-3">
              <Button className="rounded-full" onClick={() => router.push(connected ? "/messages" : "/connect")}>
                {connected ? "فتح الرسائل" : "ربط القنوات"}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
              <Button className="rounded-full" variant="outline" onClick={() => setDrawerOpen(true)}>
                <SlidersHorizontal className="size-4" aria-hidden="true" />
                تخصيص المساعد
              </Button>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6">
            <AIToggle enabled={autoReplyEnabled} onOptimisticChange={setAutoReplyEnabled} className="border-0 bg-wa-gray-50 shadow-none" />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <HeroMiniStat label="اليوم" value={String(todayCount)} />
              <HeroMiniStat label="تحتاج مراجعة" value={String(failedCount > 0 ? failedCount : unansweredCount)} danger={failedCount > 0} />
            </div>
          </div>
        </div>

        <div className="grid divide-y divide-wa-gray-100 border-t border-wa-gray-100 md:grid-cols-5 md:divide-x md:divide-y-0">
          <CommandSignal
            icon={<Zap className="size-4 text-wa-blue-600" aria-hidden="true" />}
            label="ردود AI"
            value={autoReplyEnabled ? "يرد الآن" : "متوقف"}
            detail={autoReplyEnabled ? "العملاء يحصلون على رد تلقائي" : "الردود تنتظر مراجعة يدوية"}
          />
          <CommandSignal
            icon={<RadioTower className="size-4 text-wa-success" aria-hidden="true" />}
            label="قنوات Meta"
            value={connected ? "متصل" : "غير متصل"}
            detail={connected ? connection?.displayName ?? "قناة النشاط جاهزة" : "وصّلي واتساب أو إنستجرام أو ماسنجر"}
          />
          <CommandSignal
            icon={<MessageSquareText className="size-4 text-wa-gray-500" aria-hidden="true" />}
            label="الرسائل"
            value={`${inboundCount} رسالة`}
            detail={lastMessage ? `آخر نشاط ${formatTimestamp(lastMessage.createdAt)}` : "لا توجد رسائل بعد"}
          />
          <CommandSignal
            href="/leads"
            icon={<UserPlus className="size-4 text-wa-blue-600" aria-hidden="true" />}
            label="Leads هذا الشهر"
            value={String(initialMonthlyLeadsCount)}
            detail={initialMonthlyLeadsCount > 0 ? "تم اكتشاف عملاء مهتمين" : "طلبات الشراء ستظهر هنا"}
          />
          <CommandSignal
            icon={<CreditCard className="size-4 text-wa-gray-500" aria-hidden="true" />}
            label="الخطة"
            value={user.planTier}
            detail={`استخدام ${usagePercent}% من ردود الشهر`}
          />
        </div>
      </section>

      <section className="mt-4 grid gap-4 sm:mt-5 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
        <aside className="space-y-4">
          <section className="rounded-[22px] border border-wa-gray-100 bg-white p-4 shadow-[0_12px_36px_rgba(13,20,33,0.04)] sm:rounded-[28px]">
            <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">خطوات اليوم</p>
            <div className="mt-4 space-y-2.5">
              <NextStepRow
                done={connected}
                icon={<PhoneCall className="size-4" aria-hidden="true" />}
                title="ربط القنوات"
                body={connected ? "قناة واحدة جاهزة على الأقل." : "كمّلي الربط أولًا."}
                href="/connect"
              />
              <NextStepRow
                done={autoReplyEnabled}
                icon={<Bot className="size-4" aria-hidden="true" />}
                title="تشغيل ردود AI"
                body={autoReplyEnabled ? "المساعد يعمل الآن." : "شغّلي الردود من الزر الرئيسي."}
                href="/dashboard"
              />
              <NextStepRow
                done={Boolean(settings.businessContext)}
                icon={<SlidersHorizontal className="size-4" aria-hidden="true" />}
                title="تعليم المساعد"
                body={settings.businessContext ? "معلومات النشاط محفوظة." : "أضيفي المواعيد والخدمات والقواعد."}
                onClick={() => setDrawerOpen(true)}
              />
            </div>
          </section>

          <section className="rounded-[22px] border border-wa-gray-100 bg-white p-4 shadow-[0_12px_36px_rgba(13,20,33,0.04)] sm:rounded-[28px]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">استهلاك الردود</p>
                <p className="mt-1 text-h3 font-semibold text-wa-gray-900">
                  {user.monthlyReplyCount.toLocaleString("ar-EG")} / {planLimit.toLocaleString("ar-EG")}
                </p>
              </div>
              <CreditCard className="size-5 text-wa-blue-600" aria-hidden="true" />
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-wa-gray-100">
              <div className="h-full rounded-full bg-wa-blue-600" style={{ width: `${usagePercent}%` }} />
            </div>
            <Link href="/billing" className="mt-4 inline-flex text-body-sm font-semibold text-wa-blue-600 hover:underline">
              إدارة الفوترة
            </Link>
          </section>
        </aside>

        <div className="overflow-hidden rounded-[22px] border border-wa-gray-100 bg-white shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px]">
          <header className="border-b border-wa-gray-100 p-4 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">صندوق الرسائل</p>
                <h2 className="mt-1 text-h3 font-semibold text-wa-gray-900 sm:text-h2">آخر محادثات السوشيال</h2>
              </div>
              <Link href="/messages" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-wa-gray-100 px-4 text-body-sm font-semibold text-wa-blue-600 transition hover:bg-wa-blue-50">
                عرض الكل
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <QueueChip active label="الكل" value={String(messages.length)} />
              <QueueChip label="تحتاج رد" value={String(unansweredCount)} />
              <QueueChip label="متوقفة" value={String(failedCount)} danger={failedCount > 0} />
            </div>
          </header>
          {recentMessages.length > 0 ? (
            recentMessages.map((message) => (
              <ConversationCard
                key={message.id}
                aiGenerated={message.status === "REPLIED" && Boolean(message.aiReplyText)}
                contactName={message.connection?.displayName}
                channel={message.channel}
                failed={message.status === "FAILED"}
                handoff={message.handoffActive}
                resolved={Boolean(message.resolvedAt)}
                rating={message.rating}
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
          ) : (
            <EmptyState
              icon={<MessageSquareText className="size-6 text-wa-blue-600" aria-hidden="true" />}
              title="لا توجد محادثات بعد"
              body="عندما يرسل العملاء إلى واتساب أو إنستجرام أو ماسنجر، ستظهر المحادثات هنا مع رد المساعد."
              actionLabel={connected ? "فتح الرسائل" : "ربط القنوات"}
              onAction={() => router.push(connected ? "/messages" : "/connect")}
            />
          )}
        </div>

        <aside className="space-y-4">
          <section className="rounded-[22px] border border-wa-gray-100 bg-white p-4 shadow-[0_12px_36px_rgba(13,20,33,0.04)] sm:rounded-[28px] sm:p-5">
            <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">حالة المساعد</p>
            <div className="mt-4 space-y-3">
              <HealthRow
                ok={connected}
                title="اتصال القنوات"
                body={connected ? "قناة النشاط الأساسية متصلة." : "وصّلي قناة واحدة على الأقل قبل استقبال العملاء."}
              />
              <HealthRow
                ok={autoReplyEnabled}
                title="الردود التلقائية"
                body={autoReplyEnabled ? "kallem يرد على العملاء." : "الردود متوقفة."}
              />
              <HealthRow
                ok={failedCount === 0}
                title="توصيل الردود"
                body={failedCount === 0 ? "لا توجد ردود متوقفة." : "يوجد رد متوقف. افتحي المحادثة لمعرفة السبب."}
              />
              {possibleTestNumber ? (
                <HealthRow
                  ok={false}
                  title="وصول العملاء"
                  body="أرقام Meta التجريبية تحتاج أرقام اختبار معتمدة. اربطي رقم إنتاج للعملاء الحقيقيين."
                />
              ) : null}
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
          contactName={activeConversation.connection?.displayName ?? getCustomerPhone(activeConversation)}
          handoffActive={Boolean(activeConversation.handoffActive)}
          rating={activeConversation.rating}
          ratingRequestedAt={activeConversation.ratingRequestedAt}
          resolvedAt={activeConversation.resolvedAt}
          phoneNumber={getCustomerPhone(activeConversation)}
          threadId={activeConversation.id}
          messages={threadMessages}
          onBack={() => setActiveConversation(null)}
          onSent={() => router.refresh()}
          onThreadUpdated={(updates) => {
            setActiveConversation((current) => (current ? { ...current, ...updates } : current));
          }}
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

function OnboardingBanner({
  hasConnection,
  hasKnowledge,
  onSkip,
}: {
  hasConnection: boolean;
  hasKnowledge: boolean;
  onSkip: () => void;
}) {
  const steps = [
    {
      done: hasConnection,
      href: "/connect",
      icon: RadioTower,
      title: "① ربط القنوات",
      body: "وصّل واتساب أو إنستجرام أو ماسنجر حتى تصل رسائل العملاء إلى kallem.",
      action: "ربط القنوات",
    },
    {
      done: hasKnowledge,
      href: "/knowledge",
      icon: BookOpen,
      title: "② أضف معلومات نشاطك",
      body: "أدخل الخدمات والأسعار والمواعيد حتى يرد المساعد بدقة.",
      action: "أضف معلوماتك",
    },
    {
      done: false,
      href: "/knowledge#test",
      icon: Send,
      title: "③ جرّب المساعد",
      body: "اسأل سؤالًا تجريبيًا وشاهد الرد قبل استقبال العملاء.",
      action: "جرّب الآن",
    },
  ];

  return (
    <section className="mb-4 rounded-[24px] border border-wa-blue-100 bg-white p-4 shadow-[0_16px_44px_rgba(26,86,255,0.07)] sm:mb-5 sm:rounded-[30px] sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">دليل الإعداد</p>
          <h2 className="mt-1 text-h3 font-semibold text-wa-gray-900 sm:text-h2">خلّي المساعد يرد بإجابات من نشاطك، مش ردود عامة.</h2>
          <p className="mt-1 max-w-[720px] text-body-sm leading-6 text-wa-gray-600">
            ثلاث خطوات قصيرة: وصّل قناة سوشيال، علّم المساعد معلومات البيزنس، ثم جرّب الرد قبل ما تدعو العملاء.
          </p>
        </div>
        <button type="button" onClick={onSkip} className="self-start text-body-sm font-semibold text-wa-gray-500 underline-offset-4 hover:text-wa-gray-900 hover:underline">
          تخطي
        </button>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {steps.map((step) => {
          const Icon = step.icon;

          return (
            <Link
              key={step.title}
              href={step.href}
              className={cn(
                "group flex min-h-[142px] flex-col rounded-[20px] border p-4 text-right transition hover:-translate-y-0.5 hover:bg-white sm:min-h-[150px]",
                step.done ? "border-wa-success-bg bg-wa-success-bg/45" : "border-wa-gray-100 bg-wa-gray-50",
              )}
              dir="rtl"
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={cn(
                    "flex size-10 items-center justify-center rounded-2xl",
                    step.done ? "bg-white text-wa-success" : "bg-white text-wa-blue-600",
                  )}
                >
                  {step.done ? <CheckCircle2 className="size-5" aria-hidden="true" /> : <Icon className="size-5" aria-hidden="true" />}
                </span>
                <StatusBadge label={step.done ? "تم" : "التالي"} variant={step.done ? "active" : "paused"} />
              </div>
              <h3 className="mt-4 text-body font-semibold text-wa-gray-900">{step.title}</h3>
              <p className="mt-1 flex-1 text-body-sm leading-6 text-wa-gray-600">{step.body}</p>
              <span className="mt-3 inline-flex items-center justify-end gap-2 text-body-sm font-semibold text-wa-blue-600">
                {step.done ? "مراجعة" : step.action}
                <ArrowRight className="size-4 rotate-180 transition group-hover:-translate-x-1" aria-hidden="true" />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function HeroMiniStat({ danger = false, label, value }: { danger?: boolean; label: string; value: string }) {
  return (
    <div className={cn("rounded-2xl border p-3", danger ? "border-wa-error-bg bg-wa-error-bg/60" : "border-wa-gray-100 bg-white")}>
      <p className={cn("text-label font-semibold uppercase tracking-widest", danger ? "text-wa-error" : "text-wa-gray-400")}>
        {label}
      </p>
      <p className="mt-1 text-h3 font-semibold text-wa-gray-900">{value}</p>
    </div>
  );
}

function QueueChip({
  active = false,
  danger = false,
  label,
  value,
}: {
  active?: boolean;
  danger?: boolean;
  label: string;
  value: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-body-sm font-semibold",
        active
          ? "border-wa-blue-600 bg-wa-blue-50 text-wa-blue-700"
          : danger
            ? "border-wa-error-bg bg-wa-error-bg/60 text-wa-error"
            : "border-wa-gray-100 bg-white text-wa-gray-600",
      )}
    >
      {label}
      <span className="rounded-full bg-white px-2 py-0.5 text-xs text-wa-gray-500">{value}</span>
    </span>
  );
}

function HealthRow({ body, ok, title }: { body: string; ok: boolean; title: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-3">
      <span
        className={cn(
          "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl",
          ok ? "bg-wa-success-bg text-wa-success" : "bg-wa-error-bg text-wa-error",
        )}
      >
        {ok ? <CheckCircle2 className="size-4" aria-hidden="true" /> : <AlertCircle className="size-4" aria-hidden="true" />}
      </span>
      <span className="min-w-0">
        <span className="block text-body-sm font-semibold text-wa-gray-900">{title}</span>
        <span className="mt-0.5 block text-body-sm leading-5 text-wa-gray-600">{body}</span>
      </span>
    </div>
  );
}

function CommandSignal({
  detail,
  href,
  icon,
  label,
  value,
}: {
  detail: string;
  href?: string;
  icon: ReactNode;
  label: string;
  value: string;
}) {
  const content = (
    <div className="p-4 sm:p-6">
      <div className="mb-3 flex size-9 items-center justify-center rounded-xl bg-wa-gray-50 sm:mb-4 sm:size-10 sm:rounded-2xl">{icon}</div>
      <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">{label}</p>
      <p className="mt-1 text-body font-semibold text-wa-gray-900">{value}</p>
      <p className="mt-1 text-body-sm leading-5 text-wa-gray-600">{detail}</p>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block transition hover:bg-wa-gray-50">
        {content}
      </Link>
    );
  }

  return content;
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
