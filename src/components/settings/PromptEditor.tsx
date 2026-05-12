// FILE: src/components/settings/PromptEditor.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Prompt editing is presented in one place and gated visually for
 * FREE users before the API also enforces the paid-plan custom prompt rule.
 */
"use client";

import Link from "next/link";
import { Lock } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PromptEditorProps = {
  value: string;
  canEditCustomPrompt: boolean;
  businessName: string;
  language: string;
  maxReplyLength: number;
  error?: string;
  onChange: (value: string) => void;
};

function interpolatePrompt(value: string, businessName: string, language: string, maxReplyLength: number) {
  return value
    .replaceAll("{businessName}", businessName || "your business")
    .replaceAll("{language}", language || "en")
    .replaceAll("{maxReplyLength}", String(maxReplyLength || 300));
}

export function PromptEditor({ value, canEditCustomPrompt, businessName, language, maxReplyLength, error, onChange }: PromptEditorProps) {
  const characterCount = value.length;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Label htmlFor="systemPrompt">System Prompt</Label>
        <span className="text-xs text-muted-foreground">{characterCount}/2000 characters</span>
      </div>
      {!canEditCustomPrompt ? (
        <Alert>
          <Lock className="size-4" aria-hidden="true" />
          <AlertTitle>Custom prompt is a PRO or BUSINESS feature</AlertTitle>
          <AlertDescription>
            <Link href="/billing" className={cn(buttonVariants({ variant: "link" }), "h-auto p-0")}>
              Upgrade your plan
            </Link>{" "}
            to edit assistant behavior.
          </AlertDescription>
        </Alert>
      ) : null}
      <Textarea
        id="systemPrompt"
        disabled={!canEditCustomPrompt}
        rows={8}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Preview</p>
        <p className="whitespace-pre-wrap text-sm leading-6">{interpolatePrompt(value, businessName, language, maxReplyLength)}</p>
      </div>
    </div>
  );
}
