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

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
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

  if (mutation.isSuccess) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>We sent a verification link to complete your signup.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" type="button" onClick={() => mutation.reset()}>
            Use another email
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>Start automating WhatsApp first responses.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          {mutation.error ? (
            <Alert className="border-destructive/40">
              <AlertTitle>Signup failed</AlertTitle>
              <AlertDescription>{mutation.error.message}</AlertDescription>
            </Alert>
          ) : null}
          <div className="flex flex-col gap-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" autoComplete="name" aria-invalid={!!form.formState.errors.fullName} {...form.register("fullName")} />
            {form.formState.errors.fullName ? <p className="text-sm text-destructive">{form.formState.errors.fullName.message}</p> : null}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="signupEmail">Email</Label>
            <Input id="signupEmail" type="email" autoComplete="email" aria-invalid={!!form.formState.errors.email} {...form.register("email")} />
            {form.formState.errors.email ? <p className="text-sm text-destructive">{form.formState.errors.email.message}</p> : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="signupPassword">Password</Label>
              <Input
                id="signupPassword"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!form.formState.errors.password}
                {...form.register("password")}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!form.formState.errors.confirmPassword}
                {...form.register("confirmPassword")}
              />
            </div>
          </div>
          {form.formState.errors.password ? <p className="text-sm text-destructive">{form.formState.errors.password.message}</p> : null}
          {form.formState.errors.confirmPassword ? (
            <p className="text-sm text-destructive">{form.formState.errors.confirmPassword.message}</p>
          ) : null}
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox {...form.register("acceptTerms")} />
            I accept the terms and privacy policy
          </label>
          {form.formState.errors.acceptTerms ? <p className="text-sm text-destructive">{form.formState.errors.acceptTerms.message}</p> : null}
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <LoadingSpinner /> : null}
            Create account
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Login
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
