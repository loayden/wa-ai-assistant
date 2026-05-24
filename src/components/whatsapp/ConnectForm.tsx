/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: The manual connection path is the primary onboarding flow, so the
 * form is split into clear business, Meta, and verification sections.
 */
"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Building2, CheckCircle2, KeyRound, Phone, PlugZap, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiData } from "@/lib/api/client";
import { strictZodResolver } from "@/lib/validators/resolver";
import { connectWhatsAppSchema } from "@/lib/validators/whatsapp";

type ConnectWhatsAppFormValues = z.infer<typeof connectWhatsAppSchema>;

type ConnectFormProps = {
  mockMode: boolean;
  onConnected: () => void;
  ownerPhoneNumber?: string;
};

const trustPoints = [
  "يتأكد kallem أن الرقم تابع لحساب واتساب التجاري قبل حفظ أي بيانات.",
  "يتم حفظ التوكن مشفرًا بعد نجاح التحقق فقط.",
  "يحاول التطبيق تفعيل استقبال الرسائل تلقائيًا أثناء الإعداد.",
];

export function ConnectForm({ mockMode, onConnected, ownerPhoneNumber }: ConnectFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<ConnectWhatsAppFormValues>({
    resolver: strictZodResolver<ConnectWhatsAppFormValues>(connectWhatsAppSchema),
    defaultValues: {
      phoneNumberId: mockMode ? "123456789012345" : "",
      businessAccountId: mockMode ? "987654321098765" : "",
      accessToken: mockMode ? "mock_access_token_for_development" : "",
      displayName: mockMode ? "واتساب اختباري" : "",
    },
  });
  const connectMutation = useMutation({
    mutationFn: (values: ConnectWhatsAppFormValues) =>
      apiData("/api/whatsapp/connect", {
        method: "POST",
        body: JSON.stringify({
          ...values,
          displayName: values.displayName || null,
          ownerPhoneNumber: ownerPhoneNumber || undefined,
        }),
      }),
    onSuccess: () => {
      toast.success("تم ربط واتساب", {
        description: "المساعد يستطيع الآن استخدام رقم النشاط التجاري.",
      });
      onConnected();
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "تعذر ربط واتساب.";
      setFormError(message);
      toast.error("فشل الربط", {
        description: message,
      });
    },
  });

  function onSubmit(values: ConnectWhatsAppFormValues) {
    setFormError(null);
    connectMutation.mutate(values);
  }

  return (
    <Card className="overflow-hidden rounded-[22px] border-wa-gray-100 bg-white shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px]">
      <CardHeader className="border-b border-wa-gray-100 p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-wa-blue-50 text-wa-blue-600 sm:size-11 sm:rounded-2xl">
            <PlugZap className="size-4 sm:size-5" aria-hidden="true" />
          </div>
          <div>
            <CardTitle>تحقق واربط الرقم</CardTitle>
            <CardDescription className="mt-2 max-w-[680px] leading-6">
              ضعي بيانات Meta مرة واحدة. يتأكد kallem أن رقم واتساب، حساب الأعمال، والتوكن تابعين لنفس الحساب قبل حفظ أي شيء.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:space-y-5 sm:p-6">
        {mockMode ? (
          <Alert className="border-wa-warning bg-wa-warning-bg text-wa-warning">
            <AlertTitle>وضع الاختبار المحلي مفعّل</AlertTitle>
            <AlertDescription>لا تحتاجين بيانات واتساب حقيقية أثناء التجربة المحلية.</AlertDescription>
          </Alert>
        ) : null}

        <form className="space-y-3.5 sm:space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldSection
            icon={Phone}
            title="رقم النشاط التجاري"
            description="هذا الاسم يساعدك على تمييز الرقم داخل التطبيق."
          >
            <div className="space-y-2">
              <Label htmlFor="displayName">اسم الرقم داخل التطبيق</Label>
              <Input id="displayName" placeholder="دعم kallem" {...form.register("displayName")} />
              <p className="text-body-sm text-wa-gray-600">استخدمي اسمًا واضحًا يعرفه فريقك والعملاء.</p>
              {form.formState.errors.displayName ? (
                <p className="text-body-sm text-wa-error">{form.formState.errors.displayName.message}</p>
              ) : null}
            </div>
          </FieldSection>

          <FieldSection
            icon={Building2}
            title="بيانات الربط من Meta"
            description="هذه القيم تأتي من تطبيق Meta الذي يملك رقم واتساب التجاري."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phoneNumberId">معرّف رقم واتساب</Label>
                <Input className="ltr text-left" id="phoneNumberId" placeholder="Phone Number ID من Meta" {...form.register("phoneNumberId")} />
                <p className="text-body-sm text-wa-gray-600">
                  رقم تعريفي من Meta للرقم الذي سيراسله العملاء.
                </p>
                {form.formState.errors.phoneNumberId ? (
                  <p className="text-body-sm text-wa-error">{form.formState.errors.phoneNumberId.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessAccountId">معرّف حساب واتساب التجاري</Label>
                <Input className="ltr text-left" id="businessAccountId" placeholder="WhatsApp Business Account ID" {...form.register("businessAccountId")} />
                <p className="text-body-sm text-wa-gray-600">حساب الأعمال في Meta الذي يملك هذا الرقم.</p>
                {form.formState.errors.businessAccountId ? (
                  <p className="text-body-sm text-wa-error">{form.formState.errors.businessAccountId.message}</p>
                ) : null}
              </div>
            </div>
          </FieldSection>

          <FieldSection
            icon={KeyRound}
            title="توكن الوصول"
            description="يستخدم kallem هذا التوكن للتحقق من الحساب وتجهيز الربط."
          >
            <div className="space-y-2">
              <Label htmlFor="accessToken">Access Token</Label>
              <Input className="ltr text-left" id="accessToken" type="password" placeholder="توكن Meta بصلاحيات واتساب" {...form.register("accessToken")} />
              <p className="text-body-sm text-wa-gray-600">
                استخدمي توكن يملك صلاحيات قراءة أرقام واتساب، إدارة الحساب التجاري، وتفعيل الـ webhook.
              </p>
              {form.formState.errors.accessToken ? (
                <p className="text-body-sm text-wa-error">{form.formState.errors.accessToken.message}</p>
              ) : null}
            </div>
          </FieldSection>

          <div className="rounded-2xl border border-wa-blue-100 bg-wa-blue-50 p-3 sm:rounded-[22px] sm:p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-wa-blue-600" aria-hidden="true" />
              <div>
                <p className="text-body-sm font-semibold text-wa-gray-900">ماذا يحدث عند الربط؟</p>
                <div className="mt-3 grid gap-2 text-body-sm text-wa-gray-700">
                  {trustPoints.map((point) => (
                    <p key={point} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-wa-blue-600" aria-hidden="true" />
                      <span>{point}</span>
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {formError ? (
            <Alert className="border-wa-error bg-wa-error-bg">
              <AlertTitle>لم نستطع التحقق من هذا الربط</AlertTitle>
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}

          <Button className="w-full rounded-full" disabled={connectMutation.isPending} type="submit">
            <PlugZap className="size-4" aria-hidden="true" />
            {connectMutation.isPending ? "جارٍ التحقق من الربط..." : "تحقق واربط الرقم"}
          </Button>
        </form>

        <Accordion className="rounded-[22px] border-wa-gray-100 bg-wa-gray-50">
          <AccordionItem title="أين أجد هذه القيم؟">
            <ol className="list-decimal space-y-2 pr-4 text-body-sm text-wa-gray-600">
              <li>افتحي تطبيقك في Meta Developers ثم WhatsApp ثم API Setup.</li>
              <li>انسخي Phone Number ID و WhatsApp Business Account ID من نفس الصفحة.</li>
              <li>استخدمي توكن بصلاحيات WhatsApp Business Management و Messaging.</li>
              <li>ارجعي هنا ودعي kallem يتحقق من الربط قبل حفظه.</li>
            </ol>
          </AccordionItem>
          {mockMode ? (
            <AccordionItem title="التطوير المحلي">
              <p className="text-body-sm text-wa-gray-600">
                وضع الاختبار المحلي مفعّل لتجربة الـ webhook بدون إرسال حقيقي. يجب إيقافه قبل الإنتاج.
              </p>
            </AccordionItem>
          ) : null}
        </Accordion>
      </CardContent>
    </Card>
  );
}

type FieldSectionProps = {
  icon: typeof Phone;
  title: string;
  description: string;
  children: ReactNode;
};

function FieldSection({ children, description, icon: Icon, title }: FieldSectionProps) {
  return (
    <section className="rounded-[20px] border border-wa-gray-100 bg-wa-gray-50 p-3.5 sm:rounded-[24px] sm:p-5">
      <div className="mb-3 flex items-start gap-2.5 sm:mb-4 sm:gap-3">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-wa-blue-600 shadow-[0_10px_28px_rgba(13,20,33,0.05)] sm:size-10 sm:rounded-2xl">
          <Icon className="size-4" aria-hidden="true" />
        </div>
        <div>
          <p className="text-body-sm font-semibold text-wa-gray-900">{title}</p>
          <p className="mt-1 text-body-sm text-wa-gray-600">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
