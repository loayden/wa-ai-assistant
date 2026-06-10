// FILE: src/components/auth/SignupForm.tsx
"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Signup validates password confirmation and terms locally before
 * calling Supabase-backed account creation.
 */
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ArrowRight, CheckCircle2, Eye, EyeOff, MailCheck, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { BrandLogo } from "@/components/shared/BrandLogo";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiData } from "@/lib/api/client";
import { sendMarketingEvent } from "@/lib/marketing/client-events";
import { signupSchema } from "@/lib/validators/auth";
import { strictZodResolver } from "@/lib/validators/resolver";

const signupFormSchema = signupSchema
  .extend({
    confirmPassword: z.string().min(1, "أعيدي كتابة كلمة المرور للتأكيد."),
    acceptTerms: z.boolean().refine((value) => value, "يجب الموافقة على الشروط للمتابعة."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين.",
    path: ["confirmPassword"],
  });

type SignupFormInput = z.infer<typeof signupFormSchema>;

const REMEMBERED_EMAIL_KEY = "kallem:lastEmail";

export function SignupForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const form = useForm<SignupFormInput>({
    resolver: strictZodResolver<SignupFormInput>(signupFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  });
  const mutation = useMutation({
    mutationFn: (values: SignupFormInput) =>
      apiData<{ requiresEmailVerification: boolean }>("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          fullName: values.fullName,
          email: values.email,
          password: values.password,
        }),
      }),
  });

  useEffect(() => {
    setIsHydrated(true);
    try {
      const rememberedEmail = window.localStorage.getItem(REMEMBERED_EMAIL_KEY);

      if (rememberedEmail && !form.getValues("email")) {
        form.setValue("email", rememberedEmail, { shouldDirty: false, shouldValidate: false });
      }
    } catch {
      // localStorage can be unavailable in private or locked-down browser contexts.
    }
  }, [form]);

  useEffect(() => {
    const subscription = form.watch((value) => {
      const email = value.email?.trim();

      if (!email) {
        return;
      }

      try {
        window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
      } catch {
        // Ignore storage failures; they should not block signup.
      }
    });

    return () => subscription.unsubscribe();
  }, [form]);

  useEffect(() => {
    if (!mutation.isSuccess) {
      return;
    }

    sendMarketingEvent("signup_success", {
      label: "email_signup",
      source: "signup_form",
      target: "/auth/confirm",
    });
  }, [mutation.isSuccess]);

  if (mutation.isSuccess) {
    return (
      <Card className="w-full max-w-[500px] rounded-[24px] border-wa-gray-100 bg-white p-5 shadow-[0_18px_56px_rgba(13,20,33,0.08)] sm:rounded-[30px] sm:p-8">
        <CardHeader className="items-center p-0 text-center">
          <BrandLogo className="mb-4 sm:mb-6" layout="stacked" wordmarkSize="md" />
          <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-wa-blue-50 text-wa-blue-600 sm:mb-5 sm:size-14">
            <MailCheck className="size-6 sm:size-7" aria-hidden="true" />
          </div>
          <CardTitle className="text-[26px] font-semibold leading-tight text-wa-gray-900 sm:text-[30px]">راجعي بريدك الإلكتروني</CardTitle>
          <CardDescription className="mt-2 max-w-[390px] text-body-sm leading-6 text-wa-gray-600 sm:mt-3 sm:text-body">
            أرسلنا رابط التأكيد. افتحيه، وبعدها سيكمل kallem إلى إعداد قنوات السوشيال تلقائياً.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 pt-5 sm:pt-7">
          <div className="mb-5 rounded-2xl border border-wa-blue-100 bg-wa-blue-50 p-3.5 sm:mb-6 sm:p-4">
            <p className="text-body-sm font-semibold text-wa-blue-600">الخطوة التالية</p>
            <p className="mt-1 text-body-sm leading-6 text-wa-gray-700">أكدي البريد، سجّلي الدخول إذا طُلب منك، ثم اربطي واتساب أو إنستجرام أو ماسنجر من شاشة القنوات.</p>
          </div>
          <Button className="w-full rounded-full" type="button" onClick={() => mutation.reset()}>
            استخدام بريد آخر
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-[500px] rounded-[24px] border-wa-gray-100 bg-white p-5 shadow-[0_18px_56px_rgba(13,20,33,0.08)] sm:rounded-[30px] sm:p-8">
      <CardHeader className="items-center p-0 text-center">
        <BrandLogo className="mb-4 sm:mb-6" layout="stacked" wordmarkSize="md" />
        <CardTitle className="text-[26px] font-semibold leading-tight text-wa-gray-900 sm:text-[30px]">إنشاء حساب</CardTitle>
        <CardDescription className="mt-2 max-w-[390px] text-body-sm leading-6 text-wa-gray-600 sm:mt-3 sm:text-body">
          ابدئي مجاناً، أكدي بريدك، ثم اربطي قنوات العملاء: واتساب، إنستجرام، وماسنجر.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 pt-5 sm:pt-7">
        <div className="mb-5 grid gap-2.5 rounded-[20px] border border-wa-blue-100 bg-wa-blue-50 p-3.5 sm:mb-6 sm:grid-cols-2 sm:gap-3 sm:rounded-[24px] sm:p-4">
          {[
            "٥٠ رد مجاني",
            "لا تحتاج بطاقة",
            "تأكيد البريد",
            "إعداد القنوات بعدها",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-body-sm font-semibold text-wa-gray-800">
              <CheckCircle2 className="size-4 shrink-0 text-wa-blue-600" aria-hidden="true" />
              {item}
            </div>
          ))}
        </div>

        <SocialAuthButtons className="mb-5 sm:mb-6" mode="signup" nextPath="/connect" />

        <div className="mb-5 flex items-center gap-3 text-body-sm text-wa-gray-400 sm:mb-6">
          <span className="h-px flex-1 bg-wa-gray-100" />
          أو استخدم البريد الإلكتروني
          <span className="h-px flex-1 bg-wa-gray-100" />
        </div>

        <form className="flex flex-col gap-3.5 sm:gap-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          {mutation.error ? (
            <Alert className="border-wa-error bg-wa-error-bg">
              <AlertTitle>فشل إنشاء الحساب</AlertTitle>
              <AlertDescription>{mutation.error.message}</AlertDescription>
            </Alert>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <Label className="text-body-sm font-medium text-wa-gray-800" htmlFor="fullName">الاسم الكامل</Label>
            <Input id="fullName" autoComplete="name" aria-invalid={!!form.formState.errors.fullName} hasError={!!form.formState.errors.fullName} {...form.register("fullName")} />
            {form.formState.errors.fullName ? <p className="text-body-sm text-wa-error">{form.formState.errors.fullName.message}</p> : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-body-sm font-medium text-wa-gray-800" htmlFor="signupEmail">البريد الإلكتروني</Label>
            <Input id="signupEmail" type="email" autoComplete="email" aria-invalid={!!form.formState.errors.email} hasError={!!form.formState.errors.email} {...form.register("email")} />
            {form.formState.errors.email ? <p className="text-body-sm text-wa-error">{form.formState.errors.email.message}</p> : null}
          </div>
          <div className="grid gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-body-sm font-medium text-wa-gray-800" htmlFor="signupPassword">كلمة المرور</Label>
              <div className="relative">
                <Input
                  className="pr-14"
                  id="signupPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  aria-invalid={!!form.formState.errors.password}
                  hasError={!!form.formState.errors.password}
                  {...form.register("password")}
                />
                <IconButton
                  className="absolute right-1 top-1 size-10 bg-transparent sm:size-11"
                  label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </IconButton>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-body-sm font-medium text-wa-gray-800" htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
              <div className="relative">
                <Input
                  className="pr-14"
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  aria-invalid={!!form.formState.errors.confirmPassword}
                  hasError={!!form.formState.errors.confirmPassword}
                  {...form.register("confirmPassword")}
                />
                <IconButton
                  className="absolute right-1 top-1 size-10 bg-transparent sm:size-11"
                  label={showConfirmPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  onClick={() => setShowConfirmPassword((current) => !current)}
                >
                  {showConfirmPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </IconButton>
              </div>
            </div>
          </div>
          {form.formState.errors.password ? <p className="text-body-sm text-wa-error">{form.formState.errors.password.message}</p> : null}
          {form.formState.errors.confirmPassword ? (
            <p className="text-body-sm text-wa-error">{form.formState.errors.confirmPassword.message}</p>
          ) : null}
          <label className="flex items-start gap-3 rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-3.5 text-body-sm text-wa-gray-700 sm:p-4">
            <Checkbox className="mt-1" {...form.register("acceptTerms")} />
            <span>أوافق على الشروط وسياسة الخصوصية لاستخدام kallem مع قنوات السوشيال الخاصة بنشاطي.</span>
          </label>
          {form.formState.errors.acceptTerms ? <p className="text-body-sm text-wa-error">{form.formState.errors.acceptTerms.message}</p> : null}
          <div className="rounded-2xl border border-wa-gray-100 bg-white p-3.5 sm:p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-wa-blue-600" aria-hidden="true" />
              <p className="text-body-sm leading-6 text-wa-gray-600">
                بعد إنشاء الحساب، يؤكد kallem بريدك قبل فتح مسار إعداد قنوات السوشيال.
              </p>
            </div>
          </div>
          <Button className="rounded-full" disabled={!isHydrated} isLoading={mutation.isPending} type="submit">
            إنشاء الحساب
            {!mutation.isPending ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
          </Button>
          <p className="text-center text-body-sm text-wa-gray-600">
            لديك حساب بالفعل؟{" "}
            <Link href="/login" className="text-wa-blue-600 hover:underline">
              تسجيل الدخول
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
