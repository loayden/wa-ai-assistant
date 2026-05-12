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
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";

import { BrandLogo } from "@/components/shared/BrandLogo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiData } from "@/lib/api/client";
import { signupSchema } from "@/lib/validators/auth";
import { strictZodResolver } from "@/lib/validators/resolver";

const signupFormSchema = signupSchema
  .extend({
    confirmPassword: z.string().min(1),
    acceptTerms: z.boolean().refine((value) => value, "You must accept the terms."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords must match.",
    path: ["confirmPassword"],
  });

type SignupFormInput = z.infer<typeof signupFormSchema>;

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
  }, []);

  if (mutation.isSuccess) {
    return (
      <Card className="w-full max-w-[420px] rounded-2xl border-wa-gray-100 bg-white p-8">
        <CardHeader className="items-center p-0 text-center">
          <BrandLogo className="mb-6" layout="stacked" wordmarkSize="md" />
          <CardTitle className="text-h1 font-medium text-wa-gray-900">Check your email</CardTitle>
          <CardDescription className="mt-2 text-body text-wa-gray-600">We sent a verification link to complete your signup.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 pt-8">
          <Button className="w-full" type="button" onClick={() => mutation.reset()}>
            Use another email
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-[420px] rounded-2xl border-wa-gray-100 bg-white p-8">
      <CardHeader className="items-center p-0 text-center">
        <BrandLogo className="mb-6" layout="stacked" wordmarkSize="md" />
        <CardTitle className="text-h1 font-medium text-wa-gray-900">Create account</CardTitle>
        <CardDescription className="mt-2 text-body text-wa-gray-600">Start your branded WhatsApp assistant</CardDescription>
      </CardHeader>
      <CardContent className="p-0 pt-8">
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          {mutation.error ? (
            <Alert className="border-wa-error bg-wa-error-bg">
              <AlertTitle>Signup failed</AlertTitle>
              <AlertDescription>{mutation.error.message}</AlertDescription>
            </Alert>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <Label className="text-body-sm font-medium text-wa-gray-800" htmlFor="fullName">Full name</Label>
            <Input id="fullName" autoComplete="name" aria-invalid={!!form.formState.errors.fullName} hasError={!!form.formState.errors.fullName} {...form.register("fullName")} />
            {form.formState.errors.fullName ? <p className="text-body-sm text-wa-error">{form.formState.errors.fullName.message}</p> : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-body-sm font-medium text-wa-gray-800" htmlFor="signupEmail">Email</Label>
            <Input id="signupEmail" type="email" autoComplete="email" aria-invalid={!!form.formState.errors.email} hasError={!!form.formState.errors.email} {...form.register("email")} />
            {form.formState.errors.email ? <p className="text-body-sm text-wa-error">{form.formState.errors.email.message}</p> : null}
          </div>
          <div className="grid gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-body-sm font-medium text-wa-gray-800" htmlFor="signupPassword">Password</Label>
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
                  className="absolute right-1 top-1 size-11 bg-transparent"
                  label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </IconButton>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-body-sm font-medium text-wa-gray-800" htmlFor="confirmPassword">Confirm password</Label>
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
                  className="absolute right-1 top-1 size-11 bg-transparent"
                  label={showConfirmPassword ? "Hide password" : "Show password"}
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
          <label className="flex items-center gap-2 text-body-sm text-wa-gray-600">
            <Checkbox {...form.register("acceptTerms")} />
            I accept the terms and privacy policy
          </label>
          {form.formState.errors.acceptTerms ? <p className="text-body-sm text-wa-error">{form.formState.errors.acceptTerms.message}</p> : null}
          <Button disabled={!isHydrated} isLoading={mutation.isPending} type="submit">
            Create account
          </Button>
          <p className="text-center text-body-sm text-wa-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="text-wa-blue-600 hover:underline">
              Login
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
