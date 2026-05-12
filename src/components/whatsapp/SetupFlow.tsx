// FILE: src/components/whatsapp/SetupFlow.tsx
"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: The primary setup path asks for only a phone number, then moves
 * through OTP and optional voice setup while preserving the original developer
 * credential form inside an advanced disclosure.
 */
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";

import { BrandLogo } from "@/components/shared/BrandLogo";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/input";
import { OTPInput } from "@/components/ui/OTPInput";

type SetupStep = "phone" | "otp" | "voice" | "complete";

interface SetupFlowProps {
  mockMode: boolean;
  onConnected: () => void;
}

const VoiceSetup = dynamic(
  () => import("@/components/setup/VoiceSetup").then((module) => module.VoiceSetup),
  { ssr: false },
);

const ConnectForm = dynamic(
  () => import("@/components/whatsapp/ConnectForm").then((module) => module.ConnectForm),
  { ssr: false },
);

function normalizeEgyptOwnerPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (!digits) {
    return undefined;
  }

  if (digits.startsWith("20")) {
    return digits;
  }

  if (digits.startsWith("0")) {
    return `20${digits.slice(1)}`;
  }

  return `20${digits}`;
}

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) {
    return "+20";
  }

  return `+20 ${digits.slice(0, 2)}X XXX ${digits.slice(-4)}`;
}

export function SetupFlow({ mockMode, onConnected }: SetupFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<SetupStep>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [voicePreview, setVoicePreview] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    if (step !== "complete") {
      return;
    }

    const timeout = window.setTimeout(() => router.push("/dashboard"), 1500);
    return () => window.clearTimeout(timeout);
  }, [router, step]);

  function submitPhone() {
    if (phone.replace(/\D/g, "").length < 8) {
      return;
    }

    /*
     * [ROLE: FRONTEND ENGINEER]
     * Decision: SMS verification is not implemented for the live Meta flow, so
     * real environments move straight to the credential form instead of showing
     * a non-functional OTP screen.
     */
    if (!mockMode) {
      setAdvancedOpen(true);
      return;
    }

    setStep("otp");
  }

  function completeOtp(value: string) {
    if (value.length !== 6) {
      setOtpError("Enter the full 6-digit code.");
      return;
    }
    setOtpError(null);
    setStep("voice");
  }

  if (step === "complete") {
    return (
      <div className="mx-auto flex max-w-[420px] flex-col items-center px-4 pt-20 text-center">
        <div className="mb-6 flex size-16 animate-fade-in items-center justify-center rounded-full bg-wa-success-bg text-wa-success">
          <Check className="size-8" aria-hidden="true" />
        </div>
        <h2 className="text-h2 font-medium text-wa-gray-900">Your assistant is ready</h2>
      </div>
    );
  }

  if (step === "voice") {
    return (
      <div className="pt-12">
        <VoiceSetup
          onAudioReady={() => {
            setVoicePreview("Detected: General · Language: Arabic · Tone: Friendly");
          }}
          onSkip={() => setStep("complete")}
        />
        {voicePreview ? (
          <div className="mx-auto mt-6 max-w-[420px] rounded-xl border border-wa-gray-100 bg-white p-5 text-center">
            <p className="text-body font-medium text-wa-gray-900">{voicePreview}</p>
            <p className="mt-1 text-body-sm text-wa-gray-600">Looks right?</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => setVoicePreview(null)}>Change</Button>
              <Button onClick={() => setStep("complete")}>Confirm</Button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  if (step === "otp") {
    return (
      <div className="mx-auto max-w-[420px] px-4 pt-8">
        <IconButton label="Back to phone number" onClick={() => setStep("phone")}>
          <ArrowLeft aria-hidden="true" />
        </IconButton>
        <div className="mt-8 text-center">
          <h1 className="text-h1 font-medium text-wa-gray-900">Check your messages</h1>
          <p className="mt-3 text-body text-wa-gray-600">We sent a code to {maskPhone(phone)}</p>
        </div>
        <div className="mt-8">
          <OTPInput error={otpError} value={otp} onChange={setOtp} onComplete={completeOtp} />
        </div>
        <button className="mt-6 w-full text-center text-body-sm text-wa-blue-600" type="button">
          Resend code in 60s
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[420px] px-4 pt-12">
      <BrandLogo className="mb-8" layout="stacked" wordmarkSize="md" />
      <div className="text-center">
        <h1 className="text-h1 font-medium text-wa-gray-900">Connect WhatsApp</h1>
        <p className="mt-3 text-body text-wa-gray-600">Enter the business phone number customers already message.</p>
      </div>
      <div className="mt-8 flex gap-2">
        <div className="flex h-[52px] min-w-[92px] items-center justify-center rounded-lg border border-wa-gray-100 bg-wa-gray-50 text-body text-wa-gray-800">
          EG +20
        </div>
        <Input
          inputMode="tel"
          placeholder="10 1234 5678"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
      </div>
      <Button className="mt-4 w-full" disabled={phone.replace(/\D/g, "").length < 8} onClick={submitPhone}>
        {mockMode ? "Send verification code" : "Continue with API credentials"}
      </Button>
      {!mockMode ? (
        <p className="mt-3 text-center text-body-sm text-wa-gray-600">
          SMS verification is not active in this build. Connect with your Meta API credentials below.
        </p>
      ) : null}
      <div className="mt-5 rounded-xl border border-wa-gray-100 bg-white p-5">
        <button
          className="text-body-sm font-medium text-wa-blue-600"
          type="button"
          onClick={() => setAdvancedOpen((current) => !current)}
        >
          I have API credentials →
        </button>
        {advancedOpen ? (
          <>
            <div className="mt-4 rounded-xl bg-wa-warning-bg p-4 text-body-sm text-wa-warning">This requires a Meta Developer account.</div>
            <div className="mt-4">
              <ConnectForm mockMode={mockMode} onConnected={onConnected} ownerPhoneNumber={normalizeEgyptOwnerPhone(phone)} />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
