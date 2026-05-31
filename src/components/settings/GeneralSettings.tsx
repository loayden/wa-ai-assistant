// FILE: src/components/settings/GeneralSettings.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Settings are saved through one validated form so prompt behavior,
 * language, reply length, and auto-reply state remain consistent.
 */
"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { PromptEditor } from "@/components/settings/PromptEditor";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useSettings, useUpdateSettings } from "@/hooks/useSettings";
import {
  ARAB_TIMEZONES,
  ARAB_WORKING_DAY_LABELS,
  isWithinWorkingHours,
  WORKING_DAY_KEYS,
  type WorkingDayKey,
} from "@/lib/assistant/working-hours";
import { DEFAULT_NOTIFICATION_PREFS } from "@/lib/notifications/preferences";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/utils/constants";
import { strictZodResolver } from "@/lib/validators/resolver";
import { updateSettingsSchema, type UpdateSettingsInput } from "@/lib/validators/settings";

function normalizeText(value: string | null | undefined) {
  return value ?? "";
}

function toNullable(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";

  return trimmed.length > 0 ? trimmed : null;
}

const DEFAULT_WORKING_DAYS: WorkingDayKey[] = ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday"];
const WORKING_DAY_SET = new Set<string>(WORKING_DAY_KEYS);
const TIMEZONE_VALUES = ARAB_TIMEZONES.map((timezone) => timezone.value);
type SettingsTimezone = NonNullable<UpdateSettingsInput["timezone"]>;
type SettingsTone = NonNullable<UpdateSettingsInput["instagramTone"]>;
const TONE_VALUES = new Set<string>(["friendly", "professional", "playful", "sales"]);

function normalizeWorkingDays(value: readonly string[] | null | undefined): WorkingDayKey[] {
  const days = (value ?? []).filter((day): day is WorkingDayKey => WORKING_DAY_SET.has(day));

  return days.length > 0 ? days : DEFAULT_WORKING_DAYS;
}

function normalizeTimezone(value: string | null | undefined): SettingsTimezone {
  return TIMEZONE_VALUES.includes(value as SettingsTimezone) ? (value as SettingsTimezone) : "Africa/Cairo";
}

function normalizeTone(value: string | null | undefined, fallback: SettingsTone): SettingsTone {
  return TONE_VALUES.has(value ?? "") ? (value as SettingsTone) : fallback;
}

export function GeneralSettings() {
  const settingsResult = useSettings();
  const form = useForm<UpdateSettingsInput>({
    resolver: strictZodResolver<UpdateSettingsInput>(updateSettingsSchema),
    defaultValues: {
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      autoReplyEnabled: true,
      language: "ar",
      businessName: "",
      businessContext: "",
      fallbackMessage: "",
      maxReplyLength: 300,
      workingHoursEnabled: false,
      workingHoursStart: "09:00",
      workingHoursEnd: "22:00",
      workingDays: DEFAULT_WORKING_DAYS,
      offHoursMessage: "شكراً لتواصلك 🙏 نحن حالياً خارج أوقات العمل. سنرد عليك فور بدء الدوام.",
      timezone: "Africa/Cairo",
      csatEnabled: false,
      notificationPrefs: DEFAULT_NOTIFICATION_PREFS,
      commentToDmEnabled: false,
      commentToDmMessage: "مرحباً! 👋 شكراً لاهتمامك. كيف يمكنني مساعدتك؟",
      instagramTone: "friendly",
      messengerTone: "professional",
      instagramInstructions: "",
      messengerInstructions: "",
    },
  });
  const updateMutation = useUpdateSettings();

  useEffect(() => {
    if (!settingsResult.settings) {
      return;
    }

    form.reset({
      systemPrompt: settingsResult.settings.systemPrompt,
      autoReplyEnabled: settingsResult.settings.autoReplyEnabled,
      language: settingsResult.settings.language,
      businessName: normalizeText(settingsResult.settings.businessName),
      businessContext: normalizeText(settingsResult.settings.businessContext),
      fallbackMessage: normalizeText(settingsResult.settings.fallbackMessage),
      maxReplyLength: settingsResult.settings.maxReplyLength,
      workingHoursEnabled: settingsResult.settings.workingHoursEnabled,
      workingHoursStart: settingsResult.settings.workingHoursStart,
      workingHoursEnd: settingsResult.settings.workingHoursEnd,
      workingDays: normalizeWorkingDays(settingsResult.settings.workingDays),
      offHoursMessage: settingsResult.settings.offHoursMessage,
      timezone: normalizeTimezone(settingsResult.settings.timezone),
      csatEnabled: settingsResult.settings.csatEnabled,
      notificationPrefs: settingsResult.settings.notificationPrefs,
      commentToDmEnabled: settingsResult.settings.commentToDmEnabled,
      commentToDmMessage: settingsResult.settings.commentToDmMessage,
      instagramTone: normalizeTone(settingsResult.settings.instagramTone, "friendly"),
      messengerTone: normalizeTone(settingsResult.settings.messengerTone, "professional"),
      instagramInstructions: normalizeText(settingsResult.settings.instagramInstructions),
      messengerInstructions: normalizeText(settingsResult.settings.messengerInstructions),
    });
  }, [form, settingsResult.settings]);

  if (settingsResult.isLoading) {
    return <Skeleton className="h-[560px] w-full" />;
  }

  if (settingsResult.error) {
    return (
      <Alert>
        <AlertTitle>الإعدادات غير متاحة</AlertTitle>
        <AlertDescription>{settingsResult.error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!settingsResult.settings || !settingsResult.user) {
    return (
      <Alert>
        <AlertTitle>الإعدادات غير متاحة</AlertTitle>
        <AlertDescription>لم يرجع الخادم بيانات المساعد المطلوبة.</AlertDescription>
      </Alert>
    );
  }

  const canEditCustomPrompt = settingsResult.user.planTier !== "FREE";
  const businessName = String(form.watch("businessName") ?? "");
  const language = String(form.watch("language") ?? "en");
  const maxReplyLength = Number(form.watch("maxReplyLength") ?? 300);
  const systemPrompt = String(form.watch("systemPrompt") ?? DEFAULT_SYSTEM_PROMPT);
  const autoReplyEnabled = Boolean(form.watch("autoReplyEnabled"));
  const workingHoursEnabled = Boolean(form.watch("workingHoursEnabled"));
  const workingDays = normalizeWorkingDays(form.watch("workingDays") as readonly string[] | undefined);
  const offHoursMessage = String(form.watch("offHoursMessage") ?? "");
  const notificationPrefs = form.watch("notificationPrefs") ?? DEFAULT_NOTIFICATION_PREFS;
  const withinWorkingHours = isWithinWorkingHours({
    workingHoursEnabled,
    workingHoursStart: String(form.watch("workingHoursStart") ?? "09:00"),
    workingHoursEnd: String(form.watch("workingHoursEnd") ?? "22:00"),
    workingDays,
    timezone: String(form.watch("timezone") ?? "Africa/Cairo"),
  });

  function onSubmit(values: UpdateSettingsInput) {
    const payload: UpdateSettingsInput = {
      ...values,
      businessName: toNullable(values.businessName),
      businessContext: toNullable(values.businessContext),
      fallbackMessage: toNullable(values.fallbackMessage),
      maxReplyLength: Number(values.maxReplyLength ?? 300),
      notificationPrefs: {
        ...DEFAULT_NOTIFICATION_PREFS,
        ...values.notificationPrefs,
      },
      instagramInstructions: toNullable(values.instagramInstructions),
      messengerInstructions: toNullable(values.messengerInstructions),
    };

    if (!canEditCustomPrompt) {
      delete payload.systemPrompt;
    }

    updateMutation.mutate(payload);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>إعدادات المساعد</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="businessName">اسم النشاط</Label>
              <Input id="businessName" {...form.register("businessName")} />
              {form.formState.errors.businessName ? <p className="text-sm text-destructive">{form.formState.errors.businessName.message}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">لغة الرد</Label>
              <Select id="language" {...form.register("language")}>
                <option value="ar">العربية</option>
                <option value="en">الإنجليزية</option>
                <option value="fr">الفرنسية</option>
                <option value="es">الإسبانية</option>
              </Select>
              {form.formState.errors.language ? <p className="text-sm text-destructive">{form.formState.errors.language.message}</p> : null}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="businessContext">معلومات النشاط</Label>
            <Textarea id="businessContext" rows={4} {...form.register("businessContext")} />
            {form.formState.errors.businessContext ? <p className="text-sm text-destructive">{form.formState.errors.businessContext.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="fallbackMessage">رسالة عدم معرفة الإجابة</Label>
            <Textarea id="fallbackMessage" rows={3} {...form.register("fallbackMessage")} />
            {form.formState.errors.fallbackMessage ? <p className="text-sm text-destructive">{form.formState.errors.fallbackMessage.message}</p> : null}
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium">تشغيل الرد التلقائي</p>
              <p className="text-xs text-muted-foreground">يعالج رسائل واتساب الواردة ويرد عليها تلقائياً.</p>
            </div>
            <Switch
              checked={autoReplyEnabled}
              onChange={(event) => form.setValue("autoReplyEnabled", event.currentTarget.checked, { shouldDirty: true })}
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="maxReplyLength">طول الرد الأقصى</Label>
              <span className="text-sm text-muted-foreground">{maxReplyLength.toLocaleString("ar-EG")} حرف</span>
            </div>
            <Slider
              id="maxReplyLength"
              min={50}
              max={1000}
              step={10}
              value={maxReplyLength}
              onChange={(event) => form.setValue("maxReplyLength", Number(event.currentTarget.value), { shouldDirty: true })}
            />
            {form.formState.errors.maxReplyLength ? <p className="text-sm text-destructive">{form.formState.errors.maxReplyLength.message}</p> : null}
          </div>
          <PromptEditor
            value={systemPrompt}
            canEditCustomPrompt={canEditCustomPrompt}
            businessName={businessName}
            language={language}
            maxReplyLength={maxReplyLength}
            error={form.formState.errors.systemPrompt?.message}
            onChange={(value) => form.setValue("systemPrompt", value, { shouldDirty: true })}
          />
          <section className="space-y-4 rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-4 sm:rounded-3xl sm:p-5" dir="rtl">
            <div>
              <p className="text-body font-semibold text-wa-gray-900">قنوات السوشيال</p>
              <p className="mt-1 text-body-sm leading-6 text-wa-gray-600">
                اضبطي طريقة كلام المساعد على إنستجرام وماسنجر، وفعّلي التقاط التعليقات التي تحمل نية شراء.
              </p>
            </div>
            <div className="rounded-2xl border border-wa-gray-100 bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-body-sm font-semibold text-wa-gray-900">ردود تلقائية على تعليقات إنستجرام</p>
                  <p className="mt-1 text-body-sm leading-6 text-wa-gray-600">
                    عند تعليق العميل بسؤال شراء مثل &quot;بكام؟&quot; أو &quot;متوفر؟&quot;، يرسل kallem رسالة خاصة ويسجل Lead.
                  </p>
                  <p className="mt-2 rounded-2xl bg-wa-blue-50 px-3 py-2 text-xs leading-5 text-wa-blue-800">
                    يتطلب صلاحيات Meta: instagram_business_basic + pages_read_engagement + instagram_business_manage_comments.
                  </p>
                </div>
                <Switch
                  checked={Boolean(form.watch("commentToDmEnabled"))}
                  onChange={(event) => form.setValue("commentToDmEnabled", event.currentTarget.checked, { shouldDirty: true })}
                />
              </div>
              <div className="mt-4 space-y-2">
                <Label htmlFor="commentToDmMessage">رسالة الـ DM التلقائية</Label>
                <Textarea id="commentToDmMessage" rows={3} maxLength={300} {...form.register("commentToDmMessage")} />
                {form.formState.errors.commentToDmMessage ? <p className="text-sm text-destructive">{form.formState.errors.commentToDmMessage.message}</p> : null}
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-wa-gray-100 bg-white p-4">
                <p className="text-body-sm font-semibold text-wa-gray-900">شخصية إنستجرام</p>
                <div className="mt-3 space-y-2">
                  <Label htmlFor="instagramTone">النبرة</Label>
                  <Select id="instagramTone" {...form.register("instagramTone")}>
                    <option value="friendly">ودودة</option>
                    <option value="playful">خفيفة واجتماعية</option>
                    <option value="professional">احترافية</option>
                    <option value="sales">بيعية</option>
                  </Select>
                </div>
                <div className="mt-3 space-y-2">
                  <Label htmlFor="instagramInstructions">تعليمات خاصة لإنستجرام</Label>
                  <Textarea id="instagramInstructions" rows={4} {...form.register("instagramInstructions")} />
                </div>
              </div>
              <div className="rounded-2xl border border-wa-gray-100 bg-white p-4">
                <p className="text-body-sm font-semibold text-wa-gray-900">شخصية ماسنجر</p>
                <div className="mt-3 space-y-2">
                  <Label htmlFor="messengerTone">النبرة</Label>
                  <Select id="messengerTone" {...form.register("messengerTone")}>
                    <option value="professional">احترافية</option>
                    <option value="friendly">ودودة</option>
                    <option value="playful">خفيفة</option>
                    <option value="sales">بيعية</option>
                  </Select>
                </div>
                <div className="mt-3 space-y-2">
                  <Label htmlFor="messengerInstructions">تعليمات خاصة لماسنجر</Label>
                  <Textarea id="messengerInstructions" rows={4} {...form.register("messengerInstructions")} />
                </div>
              </div>
            </div>
          </section>
          <section className="space-y-4 rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-4 sm:rounded-3xl sm:p-5" dir="rtl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-body font-semibold text-wa-gray-900">ساعات العمل</p>
                <p className="mt-1 text-body-sm leading-6 text-wa-gray-600">
                  لما النشاط يكون مغلق، kallem يرسل رسالة مهذبة مرة واحدة بدل ما يرد كأنك فاتح.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={[
                    "rounded-full px-3 py-1 text-label font-semibold",
                    workingHoursEnabled
                      ? withinWorkingHours
                        ? "bg-wa-success-bg text-wa-success"
                        : "bg-wa-error-bg text-wa-error"
                      : "bg-white text-wa-gray-500",
                  ].join(" ")}
                >
                  {workingHoursEnabled ? (withinWorkingHours ? "ضمن ساعات العمل الآن" : "خارج ساعات العمل الآن") : "غير مفعّلة"}
                </span>
                <Switch
                  checked={workingHoursEnabled}
                  onChange={(event) => form.setValue("workingHoursEnabled", event.currentTarget.checked, { shouldDirty: true })}
                />
              </div>
            </div>
            <div className={!workingHoursEnabled ? "pointer-events-none opacity-50" : undefined}>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {WORKING_DAY_KEYS.map((day) => {
                  const checked = workingDays.includes(day);

                  return (
                    <label
                      key={day}
                      className={[
                        "flex min-h-11 cursor-pointer items-center justify-between rounded-2xl border px-3 text-body-sm font-semibold transition",
                        checked ? "border-wa-blue-200 bg-white text-wa-blue-700" : "border-wa-gray-100 bg-white text-wa-gray-500",
                      ].join(" ")}
                    >
                      <span>{ARAB_WORKING_DAY_LABELS[day]}</span>
                      <input
                        type="checkbox"
                        className="size-4 accent-wa-blue-600"
                        checked={checked}
                        onChange={(event) => {
                          const next = event.currentTarget.checked
                            ? Array.from(new Set([...workingDays, day]))
                            : workingDays.filter((item) => item !== day);
                          form.setValue("workingDays", next.length > 0 ? next : [day], { shouldDirty: true });
                        }}
                      />
                    </label>
                  );
                })}
              </div>
              {form.formState.errors.workingDays ? <p className="mt-2 text-sm text-destructive">{form.formState.errors.workingDays.message}</p> : null}
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="workingHoursStart">من</Label>
                  <Input id="workingHoursStart" type="time" {...form.register("workingHoursStart")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workingHoursEnd">إلى</Label>
                  <Input id="workingHoursEnd" type="time" {...form.register("workingHoursEnd")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">المنطقة الزمنية</Label>
                  <Select id="timezone" {...form.register("timezone")}>
                    {ARAB_TIMEZONES.map((timezoneOption) => (
                      <option key={timezoneOption.value} value={timezoneOption.value}>
                        {timezoneOption.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="offHoursMessage">رسالة خارج ساعات العمل</Label>
                  <span className="text-xs text-wa-gray-500">{offHoursMessage.length}/200</span>
                </div>
                <Textarea id="offHoursMessage" rows={3} maxLength={200} {...form.register("offHoursMessage")} />
                {form.formState.errors.offHoursMessage ? <p className="text-sm text-destructive">{form.formState.errors.offHoursMessage.message}</p> : null}
              </div>
            </div>
          </section>
          <section className="grid gap-4 lg:grid-cols-2" dir="rtl">
            <div className="rounded-2xl border border-wa-gray-100 p-4 sm:rounded-3xl sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-body font-semibold text-wa-gray-900">تقييم العملاء</p>
                  <p className="mt-1 text-body-sm leading-6 text-wa-gray-600">بعد إغلاق المحادثة، أرسل طلب تقييم بسيط للعميل.</p>
                </div>
                <Switch
                  checked={Boolean(form.watch("csatEnabled"))}
                  onChange={(event) => form.setValue("csatEnabled", event.currentTarget.checked, { shouldDirty: true })}
                />
              </div>
            </div>
            <div className="rounded-2xl border border-wa-gray-100 p-4 sm:rounded-3xl sm:p-5">
              <p className="text-body font-semibold text-wa-gray-900">الإشعارات</p>
              <p className="mt-1 text-body-sm leading-6 text-wa-gray-600">اختار الحالات اللي توصلك على الإيميل فوراً.</p>
              <div className="mt-4 grid gap-2">
                {[
                  ["angry", "عميل غاضب أو يحتاج اهتمام"] as const,
                  ["lead", "عميل محتمل جديد"] as const,
                  ["handoff", "طلب تدخل بشري"] as const,
                  ["ai_failed", "فشل رد AI"] as const,
                  ["daily_summary", "ملخص يومي الساعة 9 صباحاً"] as const,
                  ["weekly_report", "تقرير أسبوعي كل يوم أحد"] as const,
                ].map(([key, label]) => (
                  <label key={key} className="flex min-h-10 items-center justify-between rounded-2xl bg-wa-gray-50 px-3 text-body-sm text-wa-gray-700">
                    <span>{label}</span>
                    <input
                      type="checkbox"
                      className="size-4 accent-wa-blue-600"
                      checked={Boolean(notificationPrefs[key])}
                      onChange={(event) =>
                        form.setValue(
                          "notificationPrefs",
                          {
                            ...DEFAULT_NOTIFICATION_PREFS,
                            ...notificationPrefs,
                            [key]: event.currentTarget.checked,
                          },
                          { shouldDirty: true },
                        )
                      }
                    />
                  </label>
                ))}
              </div>
            </div>
          </section>
          {updateMutation.isError ? (
            <Alert>
              <AlertTitle>لم يتم حفظ الإعدادات</AlertTitle>
              <AlertDescription>{updateMutation.error.message}</AlertDescription>
            </Alert>
          ) : null}
          {updateMutation.isSuccess ? (
            <Alert>
              <AlertTitle>تم حفظ الإعدادات</AlertTitle>
              <AlertDescription>تم تحديث إعدادات المساعد بنجاح.</AlertDescription>
            </Alert>
          ) : null}
          <Button disabled={updateMutation.isPending} type="submit">
            {updateMutation.isPending ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
