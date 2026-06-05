// FILE: src/components/knowledge/KnowledgePageClient.tsx
"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: The knowledge page uses inline editing instead of modals so mobile
 * business owners can add information without losing context.
 */
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AlertCircle, ArrowRight, BookOpen, Bot, CheckCircle2, Clock3, HelpCircle, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiData } from "@/lib/api/client";
import { translateError } from "@/lib/errors/translateError";
import { KNOWLEDGE_CONTENT_MAX_LENGTH, KNOWLEDGE_TITLE_MAX_LENGTH } from "@/lib/knowledge/constants";
import { cn } from "@/lib/utils";
import type {
  AssistantTestResponse,
  DeleteKnowledgeEntryResponse,
  KnowledgeEntryMutationResponse,
  KnowledgeEntryResponse,
} from "@/types/api";

type KnowledgePageClientProps = {
  initialEntries: KnowledgeEntryResponse[];
};

const closedDayOptions = [
  { id: "friday", label: "الجمعة", value: "Friday" },
  { id: "saturday", label: "السبت", value: "Saturday" },
  { id: "sunday", label: "الأحد", value: "Sunday" },
];

const closedDayLabels: Record<string, string> = {
  Friday: "الجمعة",
  Saturday: "السبت",
  Sunday: "الأحد",
};

function sortEntries(entries: KnowledgeEntryResponse[]) {
  return [...entries].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type.localeCompare(b.type);
    }

    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

function buildHoursText(openTime: string, closeTime: string, closedDays: string[]) {
  const closedLabel = closedDays.length > 0 ? closedDays.map((day) => closedDayLabels[day] ?? day).join("، ") : "لا توجد أيام إغلاق ثابتة";
  return `يفتح النشاط يوميًا من ${openTime} إلى ${closeTime}. أيام الإغلاق: ${closedLabel}.`;
}

function validateKnowledgeText(label: string, value: string, maxLength: number) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return `${label} مطلوب.`;
  }

  if (trimmedValue.length > maxLength) {
    return `${label} طويل جدًا. الحد الأقصى ${formatStableNumber(maxLength)} حرف.`;
  }

  return null;
}

function formatStableNumber(value: number) {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function KnowledgePageClient({ initialEntries }: KnowledgePageClientProps) {
  const [entries, setEntries] = useState(() => sortEntries(initialEntries));
  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const [isSavingHours, setIsSavingHours] = useState(false);
  const [isAddingFaq, setIsAddingFaq] = useState(false);
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState("");
  const [testReply, setTestReply] = useState<string | null>(null);
  const [testReplyIsSystemNotice, setTestReplyIsSystemNotice] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const businessInfoEntry = useMemo(() => entries.find((entry) => entry.type === "text") ?? null, [entries]);
  const hoursEntry = useMemo(() => entries.find((entry) => entry.type === "hours") ?? null, [entries]);
  const faqEntries = useMemo(() => entries.filter((entry) => entry.type === "faq"), [entries]);

  const [businessInfo, setBusinessInfo] = useState(businessInfoEntry?.content ?? "");
  const [faqQuestion, setFaqQuestion] = useState("");
  const [faqAnswer, setFaqAnswer] = useState("");
  const [editingQuestion, setEditingQuestion] = useState("");
  const [editingAnswer, setEditingAnswer] = useState("");
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("22:00");
  const [closedDays, setClosedDays] = useState<string[]>(["Friday"]);

  function upsertEntry(entry: KnowledgeEntryResponse) {
    setEntries((current) => sortEntries([entry, ...current.filter((item) => item.id !== entry.id)]));
  }

  async function saveBusinessInfo() {
    const trimmedBusinessInfo = businessInfo.trim();
    const validationError = validateKnowledgeText("معلومات النشاط", trimmedBusinessInfo, KNOWLEDGE_CONTENT_MAX_LENGTH);

    if (validationError) {
      toast.error("لم يتم حفظ معلومات النشاط", {
        description: validationError,
      });
      return;
    }

    setIsSavingInfo(true);

    try {
      const response = await apiData<KnowledgeEntryMutationResponse>("/api/knowledge", {
        method: "POST",
        body: JSON.stringify({
          type: "text",
          title: "معلومات النشاط",
          content: trimmedBusinessInfo,
        }),
      });
      upsertEntry(response.entry);
      setBusinessInfo(response.entry.content);
      toast.success("تم حفظ معلومات النشاط", {
        description: "سيستخدم المساعد هذه المعلومات عند الرد على العملاء.",
      });
    } catch (error) {
      toast.error("لم يتم حفظ معلومات النشاط", {
        description: translateError(error, "حاولي مرة أخرى."),
      });
    } finally {
      setIsSavingInfo(false);
    }
  }

  async function addFaq() {
    const trimmedQuestion = faqQuestion.trim();
    const trimmedAnswer = faqAnswer.trim();
    const validationError =
      validateKnowledgeText("السؤال", trimmedQuestion, KNOWLEDGE_TITLE_MAX_LENGTH) ??
      validateKnowledgeText("الإجابة", trimmedAnswer, KNOWLEDGE_CONTENT_MAX_LENGTH);

    if (validationError) {
      toast.error("لم تتم إضافة السؤال", {
        description: validationError,
      });
      return;
    }

    setIsAddingFaq(true);

    try {
      const response = await apiData<KnowledgeEntryMutationResponse>("/api/knowledge", {
        method: "POST",
        body: JSON.stringify({
          type: "faq",
          title: trimmedQuestion,
          content: trimmedAnswer,
        }),
      });
      upsertEntry(response.entry);
      setFaqQuestion("");
      setFaqAnswer("");
      toast.success("تمت إضافة السؤال", {
        description: "أصبح هذا الرد متاحًا للمساعد.",
      });
    } catch (error) {
      toast.error("لم تتم إضافة السؤال", {
        description: translateError(error, "حاولي مرة أخرى."),
      });
    } finally {
      setIsAddingFaq(false);
    }
  }

  async function saveFaq(id: string) {
    const trimmedQuestion = editingQuestion.trim();
    const trimmedAnswer = editingAnswer.trim();
    const validationError =
      validateKnowledgeText("السؤال", trimmedQuestion, KNOWLEDGE_TITLE_MAX_LENGTH) ??
      validateKnowledgeText("الإجابة", trimmedAnswer, KNOWLEDGE_CONTENT_MAX_LENGTH);

    if (validationError) {
      toast.error("لم يتم تحديث السؤال", {
        description: validationError,
      });
      return;
    }

    try {
      const response = await apiData<KnowledgeEntryMutationResponse>(`/api/knowledge/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: trimmedQuestion,
          content: trimmedAnswer,
        }),
      });
      upsertEntry(response.entry);
      setEditingFaqId(null);
      toast.success("تم تحديث السؤال");
    } catch (error) {
      toast.error("لم يتم تحديث السؤال", {
        description: translateError(error, "حاولي مرة أخرى."),
      });
    }
  }

  async function deleteFaq(id: string) {
    try {
      await apiData<DeleteKnowledgeEntryResponse>(`/api/knowledge/${id}`, {
        method: "DELETE",
      });
      setEntries((current) => current.filter((entry) => entry.id !== id));
      toast.success("تم حذف السؤال");
    } catch (error) {
      toast.error("لم يتم حذف السؤال", {
        description: translateError(error, "حاولي مرة أخرى."),
      });
    }
  }

  async function saveHours() {
    setIsSavingHours(true);

    try {
      const response = await apiData<KnowledgeEntryMutationResponse>("/api/knowledge", {
        method: "POST",
        body: JSON.stringify({
          type: "hours",
          title: "ساعات العمل",
          content: buildHoursText(openTime, closeTime, closedDays),
        }),
      });
      upsertEntry(response.entry);
      toast.success("تم حفظ ساعات العمل");
    } catch (error) {
      toast.error("لم يتم حفظ ساعات العمل", {
        description: translateError(error, "حاولي مرة أخرى."),
      });
    } finally {
      setIsSavingHours(false);
    }
  }

  async function testAssistant() {
    setIsTesting(true);
    setTestReply(null);
    setTestReplyIsSystemNotice(false);

    try {
      const response = await apiData<AssistantTestResponse>("/api/assistant/test", {
        method: "POST",
        body: JSON.stringify({ message: testMessage }),
      });
      setTestReply(response.replyText);
      setTestReplyIsSystemNotice(Boolean(response.systemNotice));

      if (response.onboardingCompleted && !response.systemNotice) {
        toast.success("تم اختبار المساعد", {
          description: "اكتمل دليل الإعداد الأولي.",
        });
      }
    } catch (error) {
      setTestReply(translateError(error, "المساعد غير متاح الآن. جرّب مرة أخرى بعد قليل."));
      setTestReplyIsSystemNotice(true);
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1120px] px-3 pb-10 pt-4 sm:px-6 lg:pt-8">
      <section className="rounded-[28px] border border-wa-gray-100 bg-white p-5 shadow-[0_18px_60px_rgba(13,20,33,0.05)] sm:p-7 lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[760px]">
            <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">قاعدة المعرفة</p>
            <h1 className="mt-2 text-[30px] font-semibold leading-tight text-wa-gray-900 sm:text-[44px]">
              علّمي kallem معلومات نشاطك حتى لا يرد بردود عامة.
            </h1>
            <p className="mt-3 text-body-sm leading-6 text-wa-gray-600 sm:text-body">
              أضيفي الخدمات، الأسعار، قواعد التوصيل، وساعات العمل مرة واحدة. سيستخدم المساعد هذه المعلومات في ردود واتساب والاختبارات.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-[20px] border border-wa-gray-100 bg-wa-gray-50 p-2 text-center">
            <MiniMetric label="المعلومات" done={Boolean(businessInfoEntry)} />
            <MiniMetric label="الأسئلة" done={faqEntries.length > 0} />
            <MiniMetric label="الساعات" done={Boolean(hoursEntry)} />
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <KnowledgeCard
            icon={<BookOpen className="size-5 text-wa-blue-600" aria-hidden="true" />}
            label="معلومات النشاط"
            title="أخبر المساعد عن نشاطك التجاري"
            body="اكتب وصفًا واضحًا للخدمات، الأسعار، طريقة الحجز أو التوصيل، وأي تفاصيل لا يجب أن يخترعها المساعد."
          >
            <Textarea
              minRows={7}
              maxLength={KNOWLEDGE_CONTENT_MAX_LENGTH}
              value={businessInfo}
              onChange={(event) => setBusinessInfo(event.target.value)}
              placeholder="مثال: نحن مطعم شاورما في المعادي، نفتح من 12 ظهراً حتى 2 فجراً، نوصّل لكل القاهرة..."
            />
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-body-sm text-wa-gray-500">
                مثال: نحن مطعم شاورما في المعادي، نفتح من 12 ظهرًا حتى 2 فجرًا، والتوصيل داخل القاهرة.
                <span className="mt-1 block text-label font-semibold uppercase tracking-widest text-wa-gray-400">
                  {formatStableNumber(businessInfo.length)}/{formatStableNumber(KNOWLEDGE_CONTENT_MAX_LENGTH)}
                </span>
              </p>
              <Button className="rounded-full" isLoading={isSavingInfo} onClick={saveBusinessInfo}>
                <Save className="size-4" aria-hidden="true" />
                حفظ المعلومات
              </Button>
            </div>
          </KnowledgeCard>

          <KnowledgeCard
            icon={<HelpCircle className="size-5 text-wa-blue-600" aria-hidden="true" />}
            label="الأسئلة الشائعة"
            title="أسئلة يكررها العملاء"
            body="أضيفي إجابات دقيقة للأسئلة المتكررة. اجعلي الإجابات قصيرة وواضحة."
          >
            <div className="grid gap-3 rounded-[20px] border border-wa-gray-100 bg-wa-gray-50 p-3 sm:p-4">
              <div className="space-y-1.5">
                <Input
                  value={faqQuestion}
                  maxLength={KNOWLEDGE_TITLE_MAX_LENGTH}
                  onChange={(event) => setFaqQuestion(event.target.value)}
                  placeholder="ما هي أسعاركم؟"
                />
                <CharacterCounter value={faqQuestion} maxLength={KNOWLEDGE_TITLE_MAX_LENGTH} />
              </div>
              <div className="space-y-1.5">
                <Textarea
                  minRows={3}
                  maxLength={KNOWLEDGE_CONTENT_MAX_LENGTH}
                  value={faqAnswer}
                  onChange={(event) => setFaqAnswer(event.target.value)}
                  placeholder="اكتب إجابة واضحة يمكن إرسالها للعميل..."
                />
                <CharacterCounter value={faqAnswer} maxLength={KNOWLEDGE_CONTENT_MAX_LENGTH} />
              </div>
              <Button className="w-full rounded-full sm:w-fit" disabled={!faqQuestion.trim() || !faqAnswer.trim()} isLoading={isAddingFaq} onClick={addFaq}>
                <Plus className="size-4" aria-hidden="true" />
                إضافة سؤال
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              {faqEntries.length > 0 ? (
                faqEntries.map((entry) => {
                  const editing = editingFaqId === entry.id;

                  return (
                    <div key={entry.id} className="rounded-[18px] border border-wa-gray-100 bg-white p-3 sm:p-4">
                      {editing ? (
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <Input
                              value={editingQuestion}
                              maxLength={KNOWLEDGE_TITLE_MAX_LENGTH}
                              onChange={(event) => setEditingQuestion(event.target.value)}
                            />
                            <CharacterCounter value={editingQuestion} maxLength={KNOWLEDGE_TITLE_MAX_LENGTH} />
                          </div>
                          <div className="space-y-1.5">
                            <Textarea
                              minRows={3}
                              maxLength={KNOWLEDGE_CONTENT_MAX_LENGTH}
                              value={editingAnswer}
                              onChange={(event) => setEditingAnswer(event.target.value)}
                            />
                            <CharacterCounter value={editingAnswer} maxLength={KNOWLEDGE_CONTENT_MAX_LENGTH} />
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <Button variant="outline" className="rounded-full" onClick={() => setEditingFaqId(null)}>
                              إلغاء
                            </Button>
                            <Button className="rounded-full" onClick={() => saveFaq(entry.id)}>
                              حفظ
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-body font-semibold text-wa-gray-900">{entry.title}</p>
                            <p className="mt-1 text-body-sm leading-6 text-wa-gray-600">{entry.content}</p>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-full"
                              onClick={() => {
                                setEditingFaqId(entry.id);
                                setEditingQuestion(entry.title);
                                setEditingAnswer(entry.content);
                              }}
                            >
                              تعديل
                            </Button>
                            <Button variant="ghost" size="icon" className="rounded-full text-wa-error" onClick={() => deleteFaq(entry.id)}>
                              <Trash2 className="size-4" aria-hidden="true" />
                              <span className="sr-only">حذف السؤال</span>
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="rounded-[18px] border border-dashed border-wa-gray-200 bg-wa-gray-50 p-4 text-body-sm text-wa-gray-600">
                  لا توجد أسئلة بعد. أضيفي أول سؤال يكرره العملاء عادةً.
                </p>
              )}
            </div>
          </KnowledgeCard>

          <KnowledgeCard
            icon={<Clock3 className="size-5 text-wa-blue-600" aria-hidden="true" />}
            label="ساعات العمل"
            title="حددي ساعات العمل ببساطة"
            body="يمكن للمساعد ذكر المواعيد وتجنب وعد العميل برد فوري خارج ساعات العمل."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-body-sm font-semibold text-wa-gray-700">من</span>
                <Input type="time" value={openTime} onChange={(event) => setOpenTime(event.target.value)} />
              </label>
              <label className="space-y-2">
                <span className="text-body-sm font-semibold text-wa-gray-700">إلى</span>
                <Input type="time" value={closeTime} onChange={(event) => setCloseTime(event.target.value)} />
              </label>
            </div>
            <div className="mt-4">
              <p className="text-body-sm font-semibold text-wa-gray-700">أيام الإغلاق</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {closedDayOptions.map((day) => (
                  <label key={day.id} className="flex min-h-12 items-center gap-3 rounded-2xl border border-wa-gray-100 bg-wa-gray-50 px-3 text-body-sm font-medium text-wa-gray-700">
                    <Checkbox
                      checked={closedDays.includes(day.value)}
                      onChange={(event) => {
                        setClosedDays((current) =>
                          event.target.checked
                            ? Array.from(new Set([...current, day.value]))
                            : current.filter((value) => value !== day.value),
                        );
                      }}
                    />
                    {day.label}
                  </label>
                ))}
              </div>
            </div>
            {hoursEntry ? (
              <p className="mt-4 rounded-[18px] bg-wa-blue-50 p-3 text-body-sm leading-6 text-wa-blue-800">{hoursEntry.content}</p>
            ) : null}
            <Button className="mt-4 rounded-full" isLoading={isSavingHours} onClick={saveHours}>
              <Save className="size-4" aria-hidden="true" />
              حفظ الساعات
            </Button>
          </KnowledgeCard>
        </div>

        <aside className="space-y-4">
          <section id="test" className="scroll-mt-24 rounded-[24px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:p-5">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-wa-blue-50 text-wa-blue-600">
                <Bot className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">اختبار المساعد</p>
                <h2 className="text-h3 font-semibold text-wa-gray-900">جرّب الرد قبل العملاء</h2>
              </div>
            </div>
            <p className="mt-3 text-body-sm leading-6 text-wa-gray-600">هذا مثال على كيف سيرد المساعد على عملائك باستخدام المعلومات المحفوظة.</p>
            <div className="mt-4 space-y-3">
              <Textarea minRows={3} value={testMessage} onChange={(event) => setTestMessage(event.target.value)} placeholder="اكتب سؤال تجريبي" />
              <Button className="w-full rounded-full" disabled={!testMessage.trim()} isLoading={isTesting} onClick={testAssistant}>
                {isTesting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <ArrowRight className="size-4" aria-hidden="true" />}
                إرسال تجربة
              </Button>
            </div>
            {testReply ? (
              <div
                className={cn(
                  "mt-4 rounded-[20px] border p-4",
                  testReplyIsSystemNotice
                    ? "border-wa-gray-100 bg-wa-gray-50"
                    : "border-wa-success-bg bg-wa-success-bg/60",
                )}
              >
                <p
                  className={cn(
                    "flex items-center gap-2 text-label font-semibold uppercase tracking-widest",
                    testReplyIsSystemNotice ? "text-wa-gray-600" : "text-wa-success",
                  )}
                >
                  {testReplyIsSystemNotice ? <AlertCircle className="size-4" aria-hidden="true" /> : null}
                  {testReplyIsSystemNotice ? "رسالة نظام" : "رد المساعد"}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-body-sm leading-6 text-wa-gray-800">{testReply}</p>
              </div>
            ) : null}
          </section>

          <section className="rounded-[24px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:p-5">
            <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">كيف يساعدك؟</p>
            <div className="mt-4 space-y-3">
              <GuideRow title="ردود أقل عمومية" body="الإجابات تأتي من الخدمات، المواعيد، والأسئلة التي حفظتيها." />
              <GuideRow title="أتمتة أكثر أمانًا" body="إذا كانت المعلومة غير موجودة، يتجنب المساعد اختراع تفاصيل." />
              <GuideRow title="إعداد أسرع" body="أكملي هذه الصفحة ثم اختبري المساعد قبل استقبال العملاء." />
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

function CharacterCounter({ maxLength, value }: { maxLength: number; value: string }) {
  const isNearLimit = value.length > maxLength * 0.9;

  return (
    <p className={cn("text-right text-label font-semibold uppercase tracking-widest", isNearLimit ? "text-wa-error" : "text-wa-gray-400")}>
      {formatStableNumber(value.length)}/{formatStableNumber(maxLength)}
    </p>
  );
}

function MiniMetric({ done, label }: { done: boolean; label: string }) {
  return (
    <div className={cn("rounded-2xl px-3 py-2", done ? "bg-wa-success-bg text-wa-success" : "bg-white text-wa-gray-500")}>
      <CheckCircle2 className={cn("mx-auto size-4", done ? "opacity-100" : "opacity-30")} aria-hidden="true" />
      <p className="mt-1 text-label font-semibold uppercase tracking-widest">{label}</p>
    </div>
  );
}

function KnowledgeCard({
  body,
  children,
  icon,
  label,
  title,
}: {
  body: string;
  children: ReactNode;
  icon: ReactNode;
  label: string;
  title: string;
}) {
  return (
    <section className="rounded-[24px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:p-6">
      <div className="mb-4 flex gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-wa-blue-50">{icon}</span>
        <div>
          <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">{label}</p>
          <h2 className="mt-1 text-h3 font-semibold text-wa-gray-900 sm:text-h2">{title}</h2>
          <p className="mt-1 text-body-sm leading-6 text-wa-gray-600">{body}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function GuideRow({ body, title }: { body: string; title: string }) {
  return (
    <div className="rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-3">
      <p className="text-body-sm font-semibold text-wa-gray-900">{title}</p>
      <p className="mt-1 text-body-sm leading-5 text-wa-gray-600">{body}</p>
    </div>
  );
}
