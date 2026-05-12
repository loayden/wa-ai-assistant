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
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";

import { BrandLogo } from "@/components/shared/BrandLogo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiData } from "@/lib/api/client";
import { loginSchema, type LoginInput } from "@/lib/validators/auth";
import { strictZodResolver } from "@/lib/validators/resolver";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
      router.push(searchParams.get("next") || "/whatsapp");
      router.refresh();
    },
  });

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return (
    <Card className="w-full max-w-[420px] rounded-2xl border-wa-gray-100 bg-white p-8">
      <CardHeader className="items-center p-0 text-center">
        <BrandLogo className="mb-6" layout="stacked" wordmarkSize="md" />
        <CardTitle className="text-h1 font-medium text-wa-gray-900">Welcome back</CardTitle>
        <CardDescription className="mt-2 text-body text-wa-gray-600">Sign in to your business inbox</CardDescription>
      </CardHeader>
      <CardContent className="p-0 pt-8">
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          {mutation.error ? (
            <Alert className="border-wa-error bg-wa-error-bg">
              <AlertDescription>{mutation.error.message}</AlertDescription>
            </Alert>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <Label className="text-body-sm font-medium text-wa-gray-800" htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" aria-invalid={!!form.formState.errors.email} hasError={!!form.formState.errors.email} {...form.register("email")} />
            {form.formState.errors.email ? <p className="text-body-sm text-wa-error">{form.formState.errors.email.message}</p> : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-body-sm font-medium text-wa-gray-800" htmlFor="password">Password</Label>
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
                className="absolute right-1 top-1 size-11 bg-transparent"
                label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </IconButton>
            </div>
            {form.formState.errors.password ? <p className="text-body-sm text-wa-error">{form.formState.errors.password.message}</p> : null}
          </div>
          <div className="flex items-center justify-between gap-3 text-body-sm">
            <label className="flex items-center gap-2 text-wa-gray-600">
              <Checkbox />
              Remember me
            </label>
            <Link href="/forgot-password" className="text-wa-blue-600 hover:underline">
              Forgot password?
            </Link>
          </div>
          <Button disabled={!isHydrated} isLoading={mutation.isPending} type="submit">
            Sign in
          </Button>
          <div className="flex items-center gap-3 text-body-sm text-wa-gray-400">
            <span className="h-px flex-1 bg-wa-gray-100" />
            or
            <span className="h-px flex-1 bg-wa-gray-100" />
          </div>
          <p className="text-center text-body-sm text-wa-gray-600">
            New here?{" "}
            <Link href="/signup" className="text-wa-blue-600 hover:underline">
              Create an account
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
