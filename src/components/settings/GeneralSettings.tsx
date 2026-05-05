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

export function GeneralSettings() {
  const settingsResult = useSettings();
  const form = useForm<UpdateSettingsInput>({
    resolver: strictZodResolver<UpdateSettingsInput>(updateSettingsSchema),
    defaultValues: {
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      autoReplyEnabled: true,
      language: "en",
      businessName: "",
      businessContext: "",
      fallbackMessage: "",
      maxReplyLength: 300,
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
    });
  }, [form, settingsResult.settings]);

  if (settingsResult.isLoading) {
    return <Skeleton className="h-[560px] w-full" />;
  }

  if (settingsResult.error) {
    return (
      <Alert>
        <AlertTitle>Settings unavailable</AlertTitle>
        <AlertDescription>{settingsResult.error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!settingsResult.settings || !settingsResult.user) {
    return (
      <Alert>
        <AlertTitle>Settings unavailable</AlertTitle>
        <AlertDescription>The settings response did not include assistant data.</AlertDescription>
      </Alert>
    );
  }

  const isProPlan = settingsResult.user.planTier === "PRO";
  const businessName = String(form.watch("businessName") ?? "");
  const language = String(form.watch("language") ?? "en");
  const maxReplyLength = Number(form.watch("maxReplyLength") ?? 300);
  const systemPrompt = String(form.watch("systemPrompt") ?? DEFAULT_SYSTEM_PROMPT);
  const autoReplyEnabled = Boolean(form.watch("autoReplyEnabled"));

  function onSubmit(values: UpdateSettingsInput) {
    const payload: UpdateSettingsInput = {
      ...values,
      businessName: toNullable(values.businessName),
      businessContext: toNullable(values.businessContext),
      fallbackMessage: toNullable(values.fallbackMessage),
      maxReplyLength: Number(values.maxReplyLength ?? 300),
    };

    if (!isProPlan) {
      delete payload.systemPrompt;
    }

    updateMutation.mutate(payload);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assistant Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input id="businessName" {...form.register("businessName")} />
              {form.formState.errors.businessName ? <p className="text-sm text-destructive">{form.formState.errors.businessName.message}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select id="language" {...form.register("language")}>
                <option value="en">English</option>
                <option value="ar">Arabic</option>
                <option value="fr">French</option>
                <option value="es">Spanish</option>
              </Select>
              {form.formState.errors.language ? <p className="text-sm text-destructive">{form.formState.errors.language.message}</p> : null}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="businessContext">Business Context</Label>
            <Textarea id="businessContext" rows={4} {...form.register("businessContext")} />
            {form.formState.errors.businessContext ? <p className="text-sm text-destructive">{form.formState.errors.businessContext.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="fallbackMessage">Fallback Message</Label>
            <Textarea id="fallbackMessage" rows={3} {...form.register("fallbackMessage")} />
            {form.formState.errors.fallbackMessage ? <p className="text-sm text-destructive">{form.formState.errors.fallbackMessage.message}</p> : null}
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium">Auto-reply enabled</p>
              <p className="text-xs text-muted-foreground">Process inbound WhatsApp messages automatically.</p>
            </div>
            <Switch
              checked={autoReplyEnabled}
              onChange={(event) => form.setValue("autoReplyEnabled", event.currentTarget.checked, { shouldDirty: true })}
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="maxReplyLength">Max Reply Length</Label>
              <span className="text-sm text-muted-foreground">{maxReplyLength} characters</span>
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
            isProPlan={isProPlan}
            businessName={businessName}
            language={language}
            maxReplyLength={maxReplyLength}
            error={form.formState.errors.systemPrompt?.message}
            onChange={(value) => form.setValue("systemPrompt", value, { shouldDirty: true })}
          />
          {updateMutation.isError ? (
            <Alert>
              <AlertTitle>Settings not saved</AlertTitle>
              <AlertDescription>{updateMutation.error.message}</AlertDescription>
            </Alert>
          ) : null}
          {updateMutation.isSuccess ? (
            <Alert>
              <AlertTitle>Settings saved</AlertTitle>
              <AlertDescription>Your assistant settings have been updated.</AlertDescription>
            </Alert>
          ) : null}
          <Button disabled={updateMutation.isPending} type="submit">
            {updateMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
