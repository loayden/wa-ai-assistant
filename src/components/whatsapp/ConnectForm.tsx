// FILE: src/components/whatsapp/ConnectForm.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Connection setup uses the exact backend validator so invalid Meta
 * identifiers and short tokens fail before encrypted storage is attempted.
 */
"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { PlugZap } from "lucide-react";

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
    onSuccess: () => onConnected(),
    onError: (error) => setFormError(error instanceof Error ? error.message : "WhatsApp connection failed."),
  });

  function onSubmit(values: ConnectWhatsAppFormValues) {
    setFormError(null);
    connectMutation.mutate(values);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader>
          <CardTitle>Connect WhatsApp Business</CardTitle>
          <CardDescription>Store one tenant-scoped WhatsApp Cloud API connection for automated replies.</CardDescription>
        </CardHeader>
        <CardContent>
          {mockMode ? (
            <Alert className="mb-4 border-yellow-300 bg-yellow-50 text-yellow-950">
              <AlertTitle>Mock Mode Active</AlertTitle>
              <AlertDescription>No real WhatsApp credentials are required for local testing.</AlertDescription>
            </Alert>
          ) : null}
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phoneNumberId">Phone Number ID</Label>
                <Input id="phoneNumberId" {...form.register("phoneNumberId")} />
                {form.formState.errors.phoneNumberId ? <p className="text-sm text-destructive">{form.formState.errors.phoneNumberId.message}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessAccountId">Business Account ID</Label>
                <Input id="businessAccountId" {...form.register("businessAccountId")} />
                {form.formState.errors.businessAccountId ? <p className="text-sm text-destructive">{form.formState.errors.businessAccountId.message}</p> : null}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accessToken">Access Token</Label>
              <Input id="accessToken" type="password" {...form.register("accessToken")} />
              {form.formState.errors.accessToken ? <p className="text-sm text-destructive">{form.formState.errors.accessToken.message}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input id="displayName" {...form.register("displayName")} />
              {form.formState.errors.displayName ? <p className="text-sm text-destructive">{form.formState.errors.displayName.message}</p> : null}
            </div>
            {formError ? (
              <Alert>
                <AlertTitle>Connection failed</AlertTitle>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}
            <Button disabled={connectMutation.isPending} type="submit">
              <PlugZap className="size-4" aria-hidden="true" />
              {connectMutation.isPending ? "Connecting..." : "Connect"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Accordion>
        <AccordionItem title="Meta setup guide">
          <ol className="list-decimal space-y-2 pl-4">
            <li>Create a Meta Developer App and add the WhatsApp product.</li>
            <li>Copy your Phone Number ID and Business Account ID.</li>
            <li>Generate or attach a Cloud API access token with send permissions.</li>
            <li>Save this connection, then configure the webhook URL shown after connection.</li>
          </ol>
        </AccordionItem>
        <AccordionItem title="Local development">
          <p>Set WHATSAPP_MOCK_MODE=true to test inbound webhook processing without Meta credentials.</p>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
