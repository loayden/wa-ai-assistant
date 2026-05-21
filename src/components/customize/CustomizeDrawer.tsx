// FILE: src/components/customize/CustomizeDrawer.tsx
"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Settings collapse into one drawer so routine assistant changes are
 * reachable from the dashboard without exposing a separate settings workspace.
 */
import { Lock } from "lucide-react";

import { ToneSelector, type ToneValue } from "@/components/ai/ToneSelector";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export interface CustomizeDrawerValues {
  tone: ToneValue;
  businessName: string;
  businessContext: string;
  language: string;
  fallbackMessage: string;
  systemPrompt: string;
  largeTextEnabled: boolean;
}

export interface CustomizeDrawerProps {
  open: boolean;
  values: CustomizeDrawerValues;
  canEditCustomPrompt: boolean;
  dirty?: boolean;
  isSaving?: boolean;
  onClose: () => void;
  onChange: (values: Partial<CustomizeDrawerValues>) => void;
  onSave: () => void;
  onBilling: () => void;
  onSignOut: () => void;
}

export function CustomizeDrawer({
  canEditCustomPrompt,
  dirty = false,
  isSaving = false,
  onBilling,
  onChange,
  onClose,
  onSave,
  onSignOut,
  open,
  values,
}: CustomizeDrawerProps) {
  return (
    <BottomSheet open={open} title="Customize assistant" onClose={onClose}>
      <div className="space-y-4 pb-24 sm:space-y-6">
        <section className="space-y-3 rounded-2xl border border-wa-gray-100 bg-white p-4 sm:p-5">
          <div>
            <h3 className="text-body font-medium text-wa-gray-800">Tone</h3>
            <p className="mt-1 text-body-sm text-wa-gray-600">Choose how the assistant should sound when it replies to customers.</p>
          </div>
          <ToneSelector value={values.tone} onChange={(tone) => onChange({ tone })} />
        </section>
        <section className="space-y-3 rounded-2xl border border-wa-gray-100 bg-white p-4 sm:space-y-4 sm:p-5">
          <div>
            <h3 className="text-body font-medium text-wa-gray-800">Business context</h3>
            <p className="mt-1 text-body-sm text-wa-gray-600">These details help kallem answer as if it already understands the business.</p>
          </div>
          <Input value={values.businessName} placeholder="Business name" onChange={(event) => onChange({ businessName: event.target.value })} />
          <Textarea
            maxLength={300}
            placeholder="Describe what you sell or help customers with"
            value={values.businessContext}
            onChange={(event) => onChange({ businessContext: event.target.value })}
          />
          <p className="text-right text-body-sm text-wa-gray-400">{values.businessContext.length}/300</p>
          <Select value={values.language} onChange={(event) => onChange({ language: event.target.value })}>
            <option value="en">English</option>
            <option value="ar">Arabic</option>
            <option value="fr">French</option>
            <option value="es">Spanish</option>
          </Select>
          <Input value={values.fallbackMessage} placeholder="Fallback message" onChange={(event) => onChange({ fallbackMessage: event.target.value })} />
        </section>
        <section className="space-y-3 rounded-2xl border border-wa-gray-100 bg-white p-4 sm:p-5">
          <div>
            <h3 className="text-body font-medium text-wa-gray-800">Advanced instructions</h3>
            <p className="mt-1 text-body-sm text-wa-gray-600">Use this only if you need tighter control over what the assistant should say or avoid.</p>
          </div>
          {canEditCustomPrompt ? (
            <>
              <Textarea
                className="min-h-36"
                maxLength={2000}
                value={values.systemPrompt}
                onChange={(event) => onChange({ systemPrompt: event.target.value })}
              />
              <p className="text-right text-body-sm text-wa-gray-400">{values.systemPrompt.length}/2000</p>
            </>
          ) : (
              <div className="rounded-xl border border-wa-gray-100 bg-wa-gray-50 p-4 sm:p-5">
                <Lock className="mb-3 size-5 text-wa-gray-400" aria-hidden="true" />
                <h4 className="text-body font-medium text-wa-gray-900">Custom AI instructions</h4>
                <p className="mt-1 text-body-sm text-wa-gray-600">Tell the AI exactly how to behave, what to say, and what to avoid.</p>
                <Button className="mt-4 w-full" onClick={onBilling}>Upgrade your plan</Button>
              </div>
          )}
        </section>
        <section className="space-y-3 rounded-2xl border border-wa-gray-100 bg-white p-4 sm:p-5">
          <Button className="w-full" variant="outline" onClick={onBilling}>View billing</Button>
          <Button className="w-full text-wa-error" variant="ghost" onClick={onSignOut}>Sign out</Button>
        </section>
      </div>
      {dirty ? (
        <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-wa-gray-100 bg-white p-4 sm:p-5">
          <Button className="mx-auto w-full max-w-[480px]" isLoading={isSaving} onClick={onSave}>Save changes</Button>
        </div>
      ) : null}
    </BottomSheet>
  );
}
