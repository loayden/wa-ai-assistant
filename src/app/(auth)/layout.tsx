/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Auth routes now sit inside a longer two-panel shell so login and
 * signup inherit more product context and visual depth without changing the
 * form behavior itself.
 */
import Image from "next/image";
import { Bot, CheckCircle2, MailCheck, RadioTower, ShieldCheck, Sparkles, UserRound } from "lucide-react";

import { AppFooter } from "@/components/shared/AppFooter";

const authImage =
  "https://images.pexels.com/photos/3184298/pexels-photo-3184298.jpeg?auto=compress&cs=tinysrgb&w=1600";

const setupSteps = [
  {
    title: "Create account",
    body: "Use your business email so setup and billing stay connected.",
    icon: UserRound,
  },
  {
    title: "Confirm email",
    body: "Open the verification link. kallem sends you to WhatsApp setup next.",
    icon: MailCheck,
  },
  {
    title: "Connect WhatsApp",
    body: "Enter the Meta values once. The app verifies them before saving.",
    icon: RadioTower,
  },
  {
    title: "Start AI replies",
    body: "Turn the assistant on, review messages, and pause replies anytime.",
    icon: Bot,
  },
];

const authPoints = [
  "Connect one business number and keep the setup in one place.",
  "Let AI handle first replies while the owner stays in control.",
  "Review customer conversations from a calmer inbox, not a technical panel.",
];

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="min-h-screen bg-white text-wa-gray-900">
      <div className="pointer-events-none fixed inset-0 opacity-60 [background-image:linear-gradient(rgba(26,86,255,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(26,86,255,.06)_1px,transparent_1px)] [background-size:72px_72px]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(235,240,255,0.88),rgba(255,255,255,0.94)_30%,rgba(255,255,255,1)_70%)]" />

      <div className="relative mx-auto grid min-h-screen max-w-[1320px] gap-5 px-3 py-4 sm:px-4 sm:py-6 lg:grid-cols-[0.98fr_0.82fr] lg:px-6 lg:py-8">
        <section className="order-2 flex flex-col overflow-hidden rounded-[24px] border border-wa-gray-100 bg-white shadow-[0_18px_56px_rgba(13,20,33,0.06)] sm:rounded-[32px] lg:order-1">
          <div className="relative min-h-[220px] w-full border-b border-wa-gray-100 sm:min-h-[340px]">
            <Image
              src={authImage}
              alt="Small business team working together around a laptop"
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 56vw"
            />
            <div className="absolute inset-x-3 bottom-3 rounded-[20px] border border-white/70 bg-white/92 p-4 shadow-[0_18px_52px_rgba(13,20,33,0.10)] backdrop-blur sm:inset-x-5 sm:bottom-5 sm:rounded-[24px] sm:p-5">
              <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">Business-ready setup</p>
              <p className="mt-2 max-w-[620px] text-body font-medium text-wa-gray-900">A clear way to connect WhatsApp, control AI replies, and keep customers moving.</p>
            </div>
          </div>

          <div className="grid gap-5 p-4 sm:gap-8 sm:p-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="lg:pr-3">
              <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">Why teams choose kallem</p>
              <h1 className="mt-3 text-[28px] font-semibold leading-tight text-wa-gray-900 sm:text-[42px] sm:leading-[1.08]">A quieter control surface for customer conversations.</h1>
              <p className="mt-3 text-body-sm leading-6 text-wa-gray-600 sm:mt-4 sm:text-body-lg">
                Use this account to connect the business number, manage reply behavior, and keep billing and message status in one place.
              </p>

              <div className="mt-5 grid gap-2.5 sm:mt-6 sm:gap-3">
                {authPoints.map((point) => (
                  <div key={point} className="flex items-start gap-3 rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-3.5 sm:p-4">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-wa-blue-600" aria-hidden="true" />
                    <p className="text-body text-wa-gray-700">{point}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[22px] border border-wa-blue-100 bg-white p-4 shadow-[0_14px_42px_rgba(26,86,255,0.06)] sm:rounded-[28px] sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">Setup path</p>
                  <h2 className="mt-2 text-xl font-semibold text-wa-gray-900 sm:text-2xl">From signup to live replies</h2>
                </div>
                <span className="rounded-full bg-wa-blue-50 px-3 py-1.5 text-xs font-semibold text-wa-blue-600">4 steps</span>
              </div>
              <div className="mt-4 space-y-3 sm:mt-5 sm:space-y-4">
                {setupSteps.map((step, index) => {
                  const Icon = step.icon;

                  return (
                    <div key={step.title} className="grid grid-cols-[38px_1fr] gap-3 sm:grid-cols-[44px_1fr] sm:gap-4">
                      <div className="relative">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-wa-blue-600 text-white shadow-[0_14px_34px_rgba(26,86,255,0.18)] sm:size-11 sm:rounded-2xl">
                          <Icon className="size-4 sm:size-5" aria-hidden="true" />
                        </div>
                        {index < setupSteps.length - 1 ? <span className="absolute left-1/2 top-10 h-7 w-px -translate-x-1/2 bg-wa-blue-100 sm:top-12 sm:h-8" /> : null}
                      </div>
                      <div className="pb-2">
                        <p className="text-body font-semibold text-wa-gray-900">{step.title}</p>
                        <p className="mt-1 text-body-sm leading-6 text-wa-gray-600">{step.body}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-4">
                  <ShieldCheck className="size-5 text-wa-blue-600" aria-hidden="true" />
                  <p className="mt-3 text-body-sm font-semibold text-wa-gray-900">Encrypted storage</p>
                  <p className="mt-1 text-body-sm text-wa-gray-600">Connection details are protected after verification.</p>
                </div>
                <div className="rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-4">
                  <Sparkles className="size-5 text-wa-blue-600" aria-hidden="true" />
                  <p className="mt-3 text-body-sm font-semibold text-wa-gray-900">Daily control</p>
                  <p className="mt-1 text-body-sm text-wa-gray-600">Open dashboard, inbox, settings, and billing from one account.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="order-1 flex items-center justify-center py-2 lg:order-2 lg:py-0">
          {children}
        </section>
      </div>
      <div className="relative">
        <AppFooter compact />
      </div>
    </main>
  );
}
