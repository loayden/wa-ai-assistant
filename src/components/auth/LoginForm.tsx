// FILE: src/components/auth/LoginForm.tsx
"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Login uses react-hook-form with the shared Zod schema, then relies
 * on the cookie-backed auth API to establish the Supabase session.
 */
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { ArrowRight, CheckCircle2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { BrandLogo } from "@/components/shared/BrandLogo";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFastNavigation } from "@/hooks/useFastNavigation";
import { apiData } from "@/lib/api/client";
import { loginSchema, type LoginInput } from "@/lib/validators/auth";
import { strictZodResolver } from "@/lib/validators/resolver";

const REMEMBERED_EMAIL_KEY = "kallem:lastEmail";

export function LoginForm() {
  const router = useRouter();
  const fastNavigation = useFastNavigation();
  const searchParams = useSearchParams();
  const authError = searchParams.get("authError");
  const authReason = searchParams.get("authReason");
  const nextPath = searchParams.get("next") || "/connect";
  const [showPassword, setShowPassword] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const form = useForm<LoginInput>({
    resolver: strictZodResolver<LoginInput>(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  const mutation = useMutation({
    mutationFn: (values: LoginInput) =>
      apiData("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      /*
       * [ROLE: FRONTEND ENGINEER]
       * Decision: After a normal sign-in, users should land on WhatsApp setup
       * or connection status first because that is the critical next step.
       */
      fastNavigation.push(searchParams.get("next") || "/connect");
      router.refresh();
    },
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
        // Ignore storage failures; they should not block sign-in.
      }
    });

    return () => subscription.unsubscribe();
  }, [form]);

  useEffect(() => {
    if (mutation.isSuccess) {
      const email = form.getValues("email").trim();

      if (email) {
        try {
          window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
        } catch {
          // Ignore storage failures; authentication already succeeded.
        }
      }
    }
  }, [form, mutation.isSuccess]);

  return (
    <Card className="w-full max-w-[500px] rounded-[24px] border-wa-gray-100 bg-white p-5 shadow-[0_18px_56px_rgba(13,20,33,0.08)] sm:rounded-[30px] sm:p-8">
      <CardHeader className="items-center p-0 text-center">
        <BrandLogo className="mb-4 sm:mb-6" layout="stacked" wordmarkSize="md" />
        <CardTitle className="text-[26px] font-semibold leading-tight text-wa-gray-900 sm:text-[30px]">مرحباً بعودتك</CardTitle>
        <CardDescription className="mt-2 max-w-[390px] text-body-sm leading-6 text-wa-gray-600 sm:mt-3 sm:text-body">
          سجّلي الدخول لإدارة قنوات السوشيال، ردود الذكاء، المحادثات، والفوترة.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 pt-5 sm:pt-7">
        <div className="mb-5 rounded-[20px] border border-wa-blue-100 bg-wa-blue-50 p-3.5 sm:mb-6 sm:rounded-[24px] sm:p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-wa-blue-600" aria-hidden="true" />
            <div>
              <p className="text-body-sm font-semibold text-wa-gray-900">بعد تسجيل الدخول</p>
              <p className="mt-1 text-body-sm leading-6 text-wa-gray-600">
                نفتح شاشة القنوات أولاً حتى تربطي واتساب أو إنستجرام أو ماسنجر قبل الاستخدام اليومي.
              </p>
            </div>
          </div>
        </div>

        <SocialAuthButtons className="mb-5 sm:mb-6" mode="login" nextPath={nextPath} />

        <div className="mb-5 flex items-center gap-3 text-body-sm text-wa-gray-400 sm:mb-6">
          <span className="h-px flex-1 bg-wa-gray-100" />
          أو استخدم البريد الإلكتروني
          <span className="h-px flex-1 bg-wa-gray-100" />
        </div>

        <form className="flex flex-col gap-3.5 sm:gap-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          {mutation.error ? (
            <Alert className="border-wa-error bg-wa-error-bg">
              <AlertDescription>{mutation.error.message}</AlertDescription>
            </Alert>
          ) : null}
          {authError === "confirmation_failed" ? (
            <Alert className="border-wa-error bg-wa-error-bg">
              <AlertDescription>
                تعذر إكمال تسجيل الدخول الاجتماعي.
                {authReason ? <span className="mt-1 block text-xs opacity-80">{authReason}</span> : null}
              </AlertDescription>
            </Alert>
          ) : null}
          {authError === "oauth_provider_error" ? (
            <Alert className="border-wa-error bg-wa-error-bg">
              <AlertDescription>
                موفر تسجيل الدخول رفض الطلب. راجعي إعدادات Google/Facebook OAuth ثم حاولي مرة أخرى.
                {authReason ? <span className="mt-1 block text-xs opacity-80">{authReason}</span> : null}
              </AlertDescription>
            </Alert>
          ) : null}
          {authError === "confirmation_required" ? (
            <Alert className="border-wa-warning bg-wa-warning-bg">
              <AlertDescription>تم تأكيد البريد، لكن الجلسة لم تفتح تلقائياً. سجّلي الدخول مرة واحدة للمتابعة.</AlertDescription>
            </Alert>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <Label className="text-body-sm font-medium text-wa-gray-800" htmlFor="email">البريد الإلكتروني</Label>
            <Input id="email" type="email" autoComplete="email" aria-invalid={!!form.formState.errors.email} hasError={!!form.formState.errors.email} {...form.register("email")} />
            {form.formState.errors.email ? <p className="text-body-sm text-wa-error">{form.formState.errors.email.message}</p> : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-body-sm font-medium text-wa-gray-800" htmlFor="password">كلمة المرور</Label>
            <div className="relative">
              <Input
                className="pr-14"
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
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
            {form.formState.errors.password ? <p className="text-body-sm text-wa-error">{form.formState.errors.password.message}</p> : null}
          </div>
          <div className="grid gap-2 rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-4">
            {["حالة الرقم المتصل", "التحكم في ردود الذكاء", "الرسائل والفوترة"].map((item) => (
              <div key={item} className="flex items-center gap-2 text-body-sm font-medium text-wa-gray-700">
                <CheckCircle2 className="size-4 shrink-0 text-wa-blue-600" aria-hidden="true" />
                {item}
              </div>
            ))}
          </div>
          <Button className="rounded-full" disabled={!isHydrated} isLoading={mutation.isPending} type="submit">
            تسجيل الدخول
            {!mutation.isPending ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
          </Button>
          <p className="text-center text-body-sm text-wa-gray-600">
            ليس لديك حساب؟{" "}
            <Link href="/signup" className="text-wa-blue-600 hover:underline">
              إنشاء حساب
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
