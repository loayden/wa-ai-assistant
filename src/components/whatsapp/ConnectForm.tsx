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
  "kallem verifies the number against the business account before saving anything.",
  "The access token is stored encrypted after verification succeeds.",
  "The app attempts to subscribe the webhook automatically during setup.",
];

export function ConnectForm({ mockMode, onConnected, ownerPhoneNumber }: ConnectFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<ConnectWhatsAppFormValues>({
    resolver: strictZodResolver<ConnectWhatsAppFormValues>(connectWhatsAppSchema),
    defaultValues: {
      phoneNumberId: mockMode ? "123456789012345" : "",
      businessAccountId: mockMode ? "987654321098765" : "",
      accessToken: mockMode ? "mock_access_token_for_development" : "",
      displayName: mockMode ? "Mock WhatsApp" : "",
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
      toast.success("WhatsApp connected", {
        description: "Your assistant can now use this business number.",
      });
      onConnected();
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "WhatsApp connection failed.";
      setFormError(message);
      toast.error("Connection failed", {
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
            <CardTitle>Verify and connect</CardTitle>
            <CardDescription className="mt-2 max-w-[680px] leading-6">
              Paste the Meta details once. kallem checks that the number, business account, and token all belong
              together before storing anything.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:space-y-5 sm:p-6">
        {mockMode ? (
          <Alert className="border-wa-warning bg-wa-warning-bg text-wa-warning">
            <AlertTitle>Mock Mode Active</AlertTitle>
            <AlertDescription>No real WhatsApp credentials are required for local testing.</AlertDescription>
          </Alert>
        ) : null}

        <form className="space-y-3.5 sm:space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldSection
            icon={Phone}
            title="Business number"
            description="This label helps you recognize the connected number inside the app."
          >
            <div className="space-y-2">
              <Label htmlFor="displayName">Display name</Label>
              <Input id="displayName" placeholder="Kallem support" {...form.register("displayName")} />
              <p className="text-body-sm text-wa-gray-600">Use the business name customers would recognize.</p>
              {form.formState.errors.displayName ? (
                <p className="text-body-sm text-wa-error">{form.formState.errors.displayName.message}</p>
              ) : null}
            </div>
          </FieldSection>

          <FieldSection
            icon={Building2}
            title="Meta connection details"
            description="These values come from the Meta app that owns the WhatsApp Business number."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phoneNumberId">Phone Number ID</Label>
                <Input id="phoneNumberId" placeholder="The WhatsApp number ID from Meta" {...form.register("phoneNumberId")} />
                <p className="text-body-sm text-wa-gray-600">
                  The unique Meta identifier for the number customers will message.
                </p>
                {form.formState.errors.phoneNumberId ? (
                  <p className="text-body-sm text-wa-error">{form.formState.errors.phoneNumberId.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessAccountId">Business Account ID</Label>
                <Input id="businessAccountId" placeholder="Your WhatsApp Business account ID" {...form.register("businessAccountId")} />
                <p className="text-body-sm text-wa-gray-600">The Meta business account that owns this number.</p>
                {form.formState.errors.businessAccountId ? (
                  <p className="text-body-sm text-wa-error">{form.formState.errors.businessAccountId.message}</p>
                ) : null}
              </div>
            </div>
          </FieldSection>

          <FieldSection
            icon={KeyRound}
            title="Access token"
            description="kallem uses this token to verify the account and prepare the connection."
          >
            <div className="space-y-2">
              <Label htmlFor="accessToken">Access Token</Label>
              <Input id="accessToken" type="password" placeholder="A Meta token with WhatsApp permissions" {...form.register("accessToken")} />
              <p className="text-body-sm text-wa-gray-600">
                Use a token that can read phone assets, manage WhatsApp business settings, and subscribe the webhook app.
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
                <p className="text-body-sm font-semibold text-wa-gray-900">What happens when you connect</p>
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
              <AlertTitle>We couldn&apos;t verify this connection</AlertTitle>
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}

          <Button className="w-full rounded-full" disabled={connectMutation.isPending} type="submit">
            <PlugZap className="size-4" aria-hidden="true" />
            {connectMutation.isPending ? "Verifying connection..." : "Verify and connect"}
          </Button>
        </form>

        <Accordion className="rounded-[22px] border-wa-gray-100 bg-wa-gray-50">
          <AccordionItem title="Need help finding these values?">
            <ol className="list-decimal space-y-2 pl-4 text-body-sm text-wa-gray-600">
              <li>Open your Meta Developer app and add the WhatsApp product.</li>
              <li>Copy the Phone Number ID and WhatsApp Business Account ID from API Setup.</li>
              <li>Use an access token with WhatsApp business management and messaging permissions.</li>
              <li>Return here and let kallem verify the connection before saving it.</li>
            </ol>
          </AccordionItem>
          {mockMode ? (
            <AccordionItem title="Local development">
              <p className="text-body-sm text-wa-gray-600">
                Mock mode is active for local webhook testing. Turn it off before production deployment.
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
