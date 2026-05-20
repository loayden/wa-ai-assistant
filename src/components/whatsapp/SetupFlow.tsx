// FILE: src/components/whatsapp/SetupFlow.tsx
"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: This setup screen uses the direct credentials flow as the primary
 * path because Meta Embedded Signup is not available for this app account.
 */
import { useState } from "react";
import dynamic from "next/dynamic";

import { BrandLogo } from "@/components/shared/BrandLogo";
import { Input } from "@/components/ui/input";

interface SetupFlowProps {
  appUrl: string;
  mockMode: boolean;
  onConnected: () => void;
}

const ConnectForm = dynamic(
  () => import("@/components/whatsapp/ConnectForm").then((module) => module.ConnectForm),
  { ssr: false },
);

function normalizeOwnerPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (!digits) {
    return undefined;
  }

  if (digits.startsWith("20") && digits.length > 10) {
    return digits;
  }

  if (digits.startsWith("0") && digits.length >= 10) {
    return `20${digits.slice(1)}`;
  }

  return digits;
}

export function SetupFlow({ appUrl, mockMode, onConnected }: SetupFlowProps) {
  const [ownerPhoneNumber, setOwnerPhoneNumber] = useState("");

  return (
    <div className="mx-auto max-w-[720px] space-y-5 px-4 pt-12">
      <div className="mx-auto max-w-[460px] text-center">
        <BrandLogo className="mb-8" layout="stacked" wordmarkSize="md" />
        <h1 className="text-h1 font-medium text-wa-gray-900">Connect WhatsApp</h1>
        <p className="mt-3 text-body text-wa-gray-600">
          Connect your WhatsApp Business account with the values from Meta. This app will store the connection securely and wire the webhook automatically after you save it.
        </p>
      </div>
      <div className="rounded-xl border border-wa-gray-100 bg-white p-5">
        <p className="text-body-sm font-medium text-wa-gray-900">Continue with API credentials</p>
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <label className="block text-body-sm font-medium text-wa-gray-800" htmlFor="ownerPhoneNumber">
              Business phone number (optional)
            </label>
            <Input
              id="ownerPhoneNumber"
              inputMode="tel"
              placeholder="+20 11 4499 9221"
              value={ownerPhoneNumber}
              onChange={(event) => setOwnerPhoneNumber(event.target.value)}
            />
            <p className="text-body-sm text-wa-gray-600">
              Save this only if you want owner commands like <code>stop</code> and <code>resume</code> to map cleanly to the connected business number.
            </p>
          </div>
          <ConnectForm
            mockMode={mockMode}
            onConnected={onConnected}
            ownerPhoneNumber={normalizeOwnerPhone(ownerPhoneNumber)}
          />
        </div>
      </div>
      <div className="rounded-xl border border-wa-gray-100 bg-wa-gray-50 p-5">
        <p className="text-body-sm font-medium text-wa-gray-900">What you will need from Meta</p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-body-sm text-wa-gray-600">
          <li>Phone Number ID</li>
          <li>WhatsApp Business Account ID</li>
          <li>Access token with WhatsApp permissions</li>
        </ul>
        <p className="mt-3 text-body-sm text-wa-gray-600">You can find these values in Meta Developers under WhatsApp API Setup.</p>
        <p className="mt-2 text-body-sm text-wa-gray-500">Webhook target: {appUrl.replace(/\/$/, "")}/api/webhooks/whatsapp</p>
      </div>
    </div>
  );
}
