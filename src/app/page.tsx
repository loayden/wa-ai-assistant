import Image from "next/image";
import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  LockKeyhole,
  MessageSquareText,
  PauseCircle,
  RadioTower,
  ShieldCheck,
  SlidersHorizontal,
  Workflow,
  Zap,
} from "lucide-react";

import { CinematicScrollEffects } from "@/components/landing/CinematicScrollEffects";
import { MagneticLink } from "@/components/landing/MagneticLink";
import { MotionReveal } from "@/components/landing/MotionReveal";
import { SmoothScroll } from "@/components/landing/SmoothScroll";
import { BRAND_NAME, BRAND_NAME_AR } from "@/lib/utils/brand";
import { cn } from "@/lib/utils";

const restaurantImage =
  "https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg?auto=compress&cs=tinysrgb&w=1600";
const clinicImage =
  "https://images.pexels.com/photos/7578804/pexels-photo-7578804.jpeg?auto=compress&cs=tinysrgb&w=1600";
const retailImage =
  "https://images.pexels.com/photos/5650026/pexels-photo-5650026.jpeg?auto=compress&cs=tinysrgb&w=1600";

const navItems = [
  { label: "How it works", href: "#workflow" },
  { label: "Setup", href: "#setup" },
  { label: "Pricing", href: "#pricing" },
];

const footerSections = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "#workflow" },
      { label: "WhatsApp setup", href: "#setup" },
      { label: "Dashboard", href: "#command" },
      { label: "Pricing", href: "#pricing" },
    ],
  },
  {
    title: "App",
    links: [
      { label: "Create account", href: "/signup" },
      { label: "Sign in", href: "/login" },
      { label: "Open WhatsApp setup", href: "/whatsapp" },
      { label: "Billing", href: "/billing" },
    ],
  },
  {
    title: "Setup",
    links: [
      { label: "Phone Number ID", href: "#setup" },
      { label: "Business Account ID", href: "#setup" },
      { label: "Access Token", href: "#setup" },
      { label: "Verified before saving", href: "#setup" },
    ],
  },
];

const footerTrust = [
  "Manual API setup is the reliable working path.",
  "Credentials are verified before saving.",
  "Owners can pause AI replies anytime.",
];

const heroFacts = [
  { label: "Included free", value: "50 replies" },
  { label: "Owner control", value: "Pause anytime" },
  { label: "Setup path", value: "Verified API" },
  { label: "Storage", value: "Encrypted" },
];

const workflowSteps = [
  {
    eyebrow: "Step 1",
    title: "Connect the WhatsApp number",
    body: "Use the guided API setup. kallem explains every field and verifies the connection before saving it.",
    icon: RadioTower,
  },
  {
    eyebrow: "Step 2",
    title: "Teach the assistant",
    body: "Add your business context, preferred tone, language, and fallback rules so replies stay useful.",
    icon: Bot,
  },
  {
    eyebrow: "Step 3",
    title: "Review and control replies",
    body: "Open the dashboard to see if AI is active, whether WhatsApp is connected, and what customers asked.",
    icon: Workflow,
  },
];

const setupFields = [
  {
    label: "Phone Number ID",
    body: "Identifies the WhatsApp number inside Meta. kallem uses it to send and receive messages for that number.",
  },
  {
    label: "WhatsApp Business Account ID",
    body: "Identifies the business account that owns the number. This prevents connecting the wrong account.",
  },
  {
    label: "Access Token",
    body: "Lets kallem verify the number and connect the webhook. It is stored encrypted after validation.",
  },
];

const trustPoints = [
  { icon: ShieldCheck, title: "Verified before saving", body: "The app checks credentials before it turns the assistant on." },
  { icon: LockKeyhole, title: "Encrypted storage", body: "Connection details are protected and never shown back to the user." },
  { icon: PauseCircle, title: "Pause anytime", body: "Owners can stop AI replies instantly from the dashboard." },
];

const commandSignals = [
  { icon: Zap, label: "Assistant", value: "Replying to customers" },
  { icon: BadgeCheck, label: "WhatsApp", value: "Connected to this number" },
  { icon: MessageSquareText, label: "Inbox", value: "Recent conversations visible" },
];

const realInfoRows = [
  { label: "Customer message", value: "Opening hours, availability, price, location, booking request" },
  { label: "Assistant action", value: "Checks business instructions and sends a clear WhatsApp reply" },
  { label: "Owner action", value: "Reviews conversations, edits tone, pauses AI, or upgrades reply limits" },
];

const plans = [
  {
    name: "FREE",
    price: "EGP 0",
    description: "For testing kallem with one business number.",
    replies: "50 replies / month",
    numbers: "1 WhatsApp number",
    href: "/signup",
    cta: "Start free",
    features: ["Manual WhatsApp setup", "Core dashboard", "Pause or resume AI replies"],
  },
  {
    name: "PRO",
    price: "EGP 999",
    description: "For one active business that needs daily automation.",
    replies: "2,000 replies / month",
    numbers: "3 WhatsApp numbers",
    href: "/signup",
    cta: "Choose Pro",
    featured: true,
    features: ["Custom tone and business context", "Conversation review", "Overage allowed after included replies"],
  },
  {
    name: "BUSINESS",
    price: "EGP 2,499",
    description: "For higher-volume businesses and multiple customer lines.",
    replies: "10,000 replies / month",
    numbers: "10 WhatsApp numbers",
    href: "/signup",
    cta: "Choose Business",
    features: ["More connected numbers", "Clear usage tracking", "Priority support"],
  },
];

function BrandLockup({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex items-baseline gap-2 text-xl font-semibold text-wa-gray-900", className)} aria-label="kallem home">
      <span>{BRAND_NAME}</span>
      <span className="text-wa-blue-600">{BRAND_NAME_AR}</span>
    </Link>
  );
}

function SectionHeading({
  eyebrow,
  title,
  body,
  className,
}: {
  eyebrow: string;
  title: string;
  body: string;
  className?: string;
}) {
  return (
    <div className={cn("max-w-[720px]", className)} data-cinema-reveal>
      <p className="text-sm font-semibold text-wa-blue-600">{eyebrow}</p>
      <h2 className="mt-3 text-[28px] font-semibold leading-tight text-wa-gray-900 sm:mt-4 sm:text-[44px] lg:text-[54px]">{title}</h2>
      <p className="mt-3 text-body-sm leading-6 text-wa-gray-600 sm:mt-5 sm:text-lg sm:leading-8">{body}</p>
    </div>
  );
}

function FormalCard({
  children,
  className,
  ...props
}: {
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-[22px] border border-wa-gray-100 bg-white shadow-[0_16px_52px_rgba(13,20,33,0.06)] sm:rounded-[28px] sm:shadow-[0_22px_70px_rgba(13,20,33,0.08)]", className)} {...props}>
      {children}
    </div>
  );
}

function ExplainerVideo() {
  return (
    <FormalCard className="relative overflow-hidden p-2 sm:p-3" data-cinema-reveal>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(26,86,255,0.12),transparent_44%)]" />
      <div className="relative overflow-hidden rounded-[18px] border border-wa-blue-100 bg-white p-4 sm:rounded-[22px] sm:p-6">
        <div className="grid gap-3 sm:grid-cols-[0.95fr_1.05fr] sm:items-center">
          <div className="rounded-[20px] border border-wa-gray-100 bg-wa-gray-50 p-4 sm:p-5">
            <p className="text-sm font-semibold text-wa-blue-600">Live assistant flow</p>
            <h3 className="mt-2 text-2xl font-semibold leading-tight text-wa-gray-900 sm:text-3xl">
              From customer message to controlled AI reply.
            </h3>
            <p className="mt-3 text-body-sm leading-6 text-wa-gray-600 sm:text-base sm:leading-7">
              kallem connects your WhatsApp number, reads your business rules, replies to common questions, and keeps every conversation available for review.
            </p>
          </div>
          <div className="space-y-3">
            {[
              { icon: MessageSquareText, title: "Customer writes on WhatsApp", body: "Questions about hours, prices, booking, delivery, or availability arrive in the inbox." },
              { icon: Bot, title: "AI prepares the answer", body: "The assistant uses your tone, language, and business context before sending a reply." },
              { icon: ShieldCheck, title: "Owner stays in control", body: "You can review messages, pause replies, edit instructions, or upgrade reply volume." },
            ].map((step) => {
              const Icon = step.icon;

              return (
                <div key={step.title} className="flex gap-3 rounded-[18px] border border-wa-gray-100 bg-white p-3.5 shadow-[0_12px_34px_rgba(13,20,33,0.04)] sm:p-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-wa-blue-50 text-wa-blue-600">
                    <Icon className="size-4" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-body-sm font-semibold text-wa-gray-900 sm:text-base">{step.title}</p>
                    <p className="mt-1 text-body-sm leading-5 text-wa-gray-600">{step.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="relative grid gap-2 border-t border-wa-gray-100 p-3 sm:grid-cols-3 sm:gap-3 sm:p-4">
        {["Connect number", "AI replies", "Owner controls"].map((item) => (
          <div key={item} className="rounded-2xl border border-wa-gray-100 bg-wa-gray-50 px-3 py-2.5 sm:px-4 sm:py-3">
            <p className="text-sm font-semibold text-wa-gray-900">{item}</p>
          </div>
        ))}
      </div>
    </FormalCard>
  );
}

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-white text-wa-gray-900">
      <SmoothScroll />
      <CinematicScrollEffects />

      <div className="pointer-events-none fixed inset-0 z-0 opacity-70 [background-image:linear-gradient(rgba(26,86,255,.075)_1px,transparent_1px),linear-gradient(90deg,rgba(26,86,255,.075)_1px,transparent_1px)] [background-size:72px_72px]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(180deg,rgba(235,240,255,0.86),rgba(255,255,255,0.92)_28%,rgba(255,255,255,0.98)_65%,rgba(235,240,255,0.72))]" />

      <header className="sticky top-0 z-50 border-b border-wa-gray-100 bg-white/86 backdrop-blur-2xl">
        <nav className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-3 py-3 sm:gap-4 sm:px-6 sm:py-4">
          <BrandLockup />
          <div className="hidden items-center gap-1 rounded-full border border-wa-gray-100 bg-wa-gray-50 p-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-4 py-2 text-sm font-medium text-wa-gray-600 transition hover:bg-white hover:text-wa-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wa-blue-600"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden rounded-full px-4 py-2 text-sm font-semibold text-wa-gray-600 transition hover:bg-wa-gray-50 hover:text-wa-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wa-blue-600 sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-wa-blue-600 px-4 text-sm font-semibold text-white shadow-[0_18px_44px_rgba(26,86,255,0.24)] transition hover:bg-[#0E47E8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wa-blue-600 sm:min-h-11 sm:px-5"
            >
              Start free
            </Link>
          </div>
        </nav>
      </header>

      <section className="relative z-10 mx-auto grid min-h-[calc(100svh-64px)] max-w-[1200px] gap-8 px-3 pb-12 pt-10 sm:gap-10 sm:px-6 sm:pb-16 sm:pt-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:pb-20 lg:pt-20">
        <div className="max-w-[650px]">
          <MotionReveal>
            <h1 className="max-w-[12ch] text-[40px] font-semibold leading-[1.04] text-wa-gray-900 sm:max-w-[11ch] sm:text-[68px] sm:leading-[1.02] lg:text-[82px]">
              AI replies for your business WhatsApp.
            </h1>
            <p className="mt-5 max-w-[610px] text-body leading-7 text-wa-gray-600 sm:mt-7 sm:text-xl sm:leading-8">
              {BRAND_NAME_AR} | {BRAND_NAME} helps small businesses answer customer messages, review conversations, customize the assistant, and manage reply limits from one formal dashboard.
            </p>
            <div className="mt-6 rounded-[20px] border border-wa-blue-100 bg-white/82 p-4 shadow-[0_16px_44px_rgba(26,86,255,0.08)] backdrop-blur sm:mt-8 sm:rounded-[24px] sm:p-5">
              <p className="text-base font-semibold text-wa-gray-900">What users need to understand first</p>
              <p className="mt-2 text-body text-wa-gray-600">
                Connect WhatsApp once, teach the assistant your business rules, then keep control from the dashboard.
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-2.5 sm:mt-8 sm:flex-row sm:gap-3">
              <MagneticLink href="/signup" className="w-full bg-wa-blue-600 text-white shadow-[0_18px_44px_rgba(26,86,255,0.24)] hover:bg-[#0E47E8] sm:w-auto">
                Get started free
                <ArrowRight className="size-4" aria-hidden="true" />
              </MagneticLink>
              <MagneticLink href="#workflow" className="w-full border border-wa-gray-200 bg-white text-wa-gray-900 hover:bg-wa-gray-50 sm:w-auto">
                See how it works
              </MagneticLink>
            </div>
          </MotionReveal>

          <div className="mt-7 grid grid-cols-2 gap-2.5 sm:mt-9 sm:grid-cols-4 sm:gap-3">
            {heroFacts.map((item, index) => (
              <MotionReveal key={item.label} delay={0.08 + index * 0.04}>
                <div className="rounded-2xl border border-wa-gray-100 bg-white px-3 py-3 shadow-[0_10px_28px_rgba(13,20,33,0.05)] sm:px-4 sm:py-4">
                  <p className="text-xs font-medium text-wa-gray-400">{item.label}</p>
                  <p className="mt-2 text-base font-semibold text-wa-gray-900">{item.value}</p>
                </div>
              </MotionReveal>
            ))}
          </div>
        </div>

        <ExplainerVideo />
      </section>

      <section className="relative z-10 mx-auto max-w-[1200px] px-3 pb-14 sm:px-6 sm:pb-20">
        <div className="rounded-[22px] border border-wa-blue-100 bg-white px-4 py-3 text-body-sm leading-6 text-wa-gray-600 shadow-[0_14px_42px_rgba(13,20,33,0.05)] sm:flex sm:items-center sm:justify-between sm:rounded-[28px] sm:px-5 sm:py-4 sm:text-body">
          <span>Primary working setup: guided API credentials. Meta one-click signup is not shown as the main path because it requires BSP/Tech Provider eligibility.</span>
          <Link href="#setup" className="mt-3 inline-flex items-center gap-2 font-semibold text-wa-blue-600 sm:mt-0">
            View setup <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section id="workflow" className="relative z-10 mx-auto max-w-[1200px] px-3 py-14 sm:px-6 sm:py-20" data-cinema-section>
        <SectionHeading
          eyebrow="How it works"
          title="A formal workflow users can understand in seconds."
          body="The product path is clear: connect WhatsApp, teach the assistant your business rules, then supervise customer replies from one dashboard."
        />

        <div className="mt-8 grid gap-4 sm:mt-12 sm:gap-5 lg:grid-cols-3">
          {workflowSteps.map((step) => {
            const Icon = step.icon;

            return (
              <FormalCard key={step.title} className="p-4 sm:p-6" data-cinema-reveal>
                <div className="flex size-10 items-center justify-center rounded-xl bg-wa-blue-50 text-wa-blue-600 sm:size-12 sm:rounded-2xl">
                  <Icon className="size-4 sm:size-5" aria-hidden="true" />
                </div>
                <p className="mt-4 text-sm font-semibold text-wa-blue-600 sm:mt-6">{step.eyebrow}</p>
                <h3 className="mt-2 text-xl font-semibold leading-tight text-wa-gray-900 sm:mt-3 sm:text-2xl">{step.title}</h3>
                <p className="mt-3 text-body-sm leading-6 text-wa-gray-600 sm:mt-4 sm:text-base sm:leading-7">{step.body}</p>
              </FormalCard>
            );
          })}
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="relative min-h-[300px] overflow-hidden rounded-[22px] border border-wa-gray-100 bg-white shadow-[0_16px_52px_rgba(13,20,33,0.06)] sm:min-h-[380px] sm:rounded-[32px] sm:shadow-[0_22px_70px_rgba(13,20,33,0.08)]" data-cinema-reveal>
            <Image src={restaurantImage} alt="Restaurant team managing customers and orders" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 42vw" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.86))]" />
            <div className="absolute inset-x-3 bottom-3 rounded-[20px] border border-wa-gray-100 bg-white/90 p-4 backdrop-blur sm:inset-x-5 sm:bottom-5 sm:rounded-[24px] sm:p-5">
              <p className="text-sm font-semibold text-wa-blue-600">Restaurants, clinics, shops, and services</p>
              <h3 className="mt-2 max-w-[430px] text-2xl font-semibold leading-tight text-wa-gray-900 sm:text-3xl">
                Built for owners who cannot leave customers waiting.
              </h3>
            </div>
          </div>
          <FormalCard className="p-4 sm:p-8" data-cinema-reveal>
            <p className="text-sm font-semibold text-wa-blue-600">Real product information</p>
            <h3 className="mt-2 text-2xl font-semibold text-wa-gray-900 sm:mt-3 sm:text-3xl">Clear details before a business connects.</h3>
            <div className="mt-4 space-y-3 sm:mt-6 sm:space-y-4">
              {realInfoRows.map((row) => (
                <div key={row.label} className="rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-4 sm:p-5">
                  <p className="text-sm font-semibold text-wa-blue-600">{row.label}</p>
                  <p className="mt-2 text-body-sm leading-6 text-wa-gray-700 sm:text-base sm:leading-7">{row.value}</p>
                </div>
              ))}
            </div>
          </FormalCard>
        </div>
      </section>

      <section id="setup" className="relative z-10 mx-auto max-w-[1200px] px-3 py-14 sm:px-6 sm:py-20" data-cinema-section>
        <div className="grid gap-5 sm:gap-8 lg:grid-cols-[0.84fr_1.16fr] lg:items-start">
          <SectionHeading
            eyebrow="WhatsApp setup"
            title="Manual credentials, written in normal business language."
            body="The reliable setup path uses Meta API credentials, but every field is explained in plain language before the user connects."
          />
          <FormalCard className="p-4 sm:p-6" data-cinema-reveal>
            <div className="space-y-3 sm:space-y-4">
              {setupFields.map((field, index) => (
                <div key={field.label} className="grid gap-3 rounded-[20px] border border-wa-gray-100 bg-wa-gray-50 p-4 sm:grid-cols-[72px_1fr] sm:gap-4 sm:rounded-[24px] sm:p-5">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-wa-blue-600 text-base font-semibold text-white sm:size-14 sm:rounded-2xl sm:text-lg">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-wa-gray-900 sm:text-xl">{field.label}</h3>
                    <p className="mt-2 text-body-sm leading-6 text-wa-gray-600 sm:text-base sm:leading-7">{field.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </FormalCard>
        </div>

        <div className="mt-6 grid gap-4 sm:mt-8 sm:gap-5 lg:grid-cols-3">
          {trustPoints.map((item) => {
            const Icon = item.icon;

            return (
              <FormalCard key={item.title} className="p-4 sm:p-6" data-cinema-reveal>
                <Icon className="size-5 text-wa-blue-600 sm:size-6" aria-hidden="true" />
                <h3 className="mt-4 text-lg font-semibold text-wa-gray-900 sm:mt-5 sm:text-xl">{item.title}</h3>
                <p className="mt-2 text-body-sm leading-6 text-wa-gray-600 sm:mt-3 sm:text-base sm:leading-7">{item.body}</p>
              </FormalCard>
            );
          })}
        </div>
      </section>

      <section id="command" className="relative z-10 mx-auto max-w-[1200px] px-3 py-14 sm:px-6 sm:py-20" data-cinema-section>
        <SectionHeading
          eyebrow="Dashboard"
          title="One screen answers the user’s main questions."
          body="The dashboard shows whether AI replies are active, whether WhatsApp is connected, recent conversation activity, and where to customize the assistant."
        />

        <div className="mt-8 grid gap-4 sm:mt-12 sm:gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <FormalCard className="overflow-hidden" data-cinema-reveal>
            <div className="border-b border-wa-gray-100 px-4 py-4 sm:flex sm:items-center sm:justify-between sm:px-5">
              <div>
                <p className="text-sm text-wa-gray-400">Your AI assistant</p>
                <h3 className="mt-1 text-xl font-semibold text-wa-gray-900 sm:text-2xl">Replying to customers</h3>
              </div>
              <div className="mt-3 inline-flex h-10 w-20 items-center rounded-full bg-wa-blue-600 p-1 shadow-[0_18px_44px_rgba(26,86,255,0.24)] sm:mt-0 sm:h-12 sm:w-24">
                <span className="ml-auto size-8 rounded-full bg-white shadow-[0_8px_24px_rgba(13,20,33,0.22)] sm:size-10" />
              </div>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-3 sm:gap-4 sm:p-5">
              {commandSignals.map((signal) => {
                const Icon = signal.icon;

                return (
                  <div key={signal.label} className="rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-4 sm:p-5">
                    <Icon className="size-4 text-wa-blue-600 sm:size-5" aria-hidden="true" />
                    <p className="mt-4 text-sm text-wa-gray-400 sm:mt-5">{signal.label}</p>
                    <p className="mt-2 text-body-sm font-semibold leading-6 text-wa-gray-900 sm:text-base">{signal.value}</p>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-wa-gray-100 p-4 sm:p-5">
              <div className="rounded-[20px] border border-wa-gray-100 bg-white p-4 sm:rounded-[24px] sm:p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-wa-gray-900">Recent conversations</p>
                    <p className="mt-1 text-sm text-wa-gray-500">Clear previews help owners review customer activity quickly.</p>
                  </div>
                  <Link href="/messages" className="text-sm font-semibold text-wa-blue-600">
                    View inbox
                  </Link>
                </div>
                <div className="mt-4 space-y-3">
                  {["New question received", "AI reply sent", "Owner can review"].map((row) => (
                    <div key={row} className="flex items-center justify-between gap-4 rounded-2xl border border-wa-gray-100 bg-wa-gray-50 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-wa-gray-900">{row}</p>
                        <p className="mt-1 truncate text-sm text-wa-gray-500">Visible in message history after WhatsApp is connected.</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-wa-blue-50 px-3 py-1 text-xs font-semibold text-wa-blue-600">Ready</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FormalCard>

          <div className="grid gap-5">
            <div className="relative min-h-[240px] overflow-hidden rounded-[22px] border border-wa-gray-100 bg-white shadow-[0_16px_52px_rgba(13,20,33,0.06)] sm:min-h-[260px] sm:rounded-[32px] sm:shadow-[0_22px_70px_rgba(13,20,33,0.08)]" data-cinema-reveal>
              <Image src={clinicImage} alt="Clinic reception desk where customer messages need fast replies" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 40vw" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.86))]" />
              <div className="absolute inset-x-3 bottom-3 rounded-[20px] border border-wa-gray-100 bg-white/92 p-4 backdrop-blur sm:inset-x-5 sm:bottom-5 sm:rounded-[24px] sm:p-5">
                <p className="max-w-[360px] text-xl font-semibold leading-tight text-wa-gray-900 sm:text-2xl">
                  Customers keep using WhatsApp. Owners get control and clarity.
                </p>
              </div>
            </div>
            <FormalCard className="p-4 sm:p-6" data-cinema-reveal>
              <SlidersHorizontal className="size-5 text-wa-blue-600 sm:size-6" aria-hidden="true" />
              <h3 className="mt-3 text-xl font-semibold text-wa-gray-900 sm:mt-4 sm:text-2xl">Customize without feeling technical.</h3>
              <p className="mt-3 text-body-sm leading-6 text-wa-gray-600 sm:mt-4 sm:text-base sm:leading-7">
                Tone, language, business context, fallback behavior, accessibility, billing, and sign out live in one clear settings surface.
              </p>
            </FormalCard>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-y border-wa-gray-100 bg-wa-gray-50/80 py-14 sm:py-20" data-cinema-section>
        <div className="mx-auto max-w-[1200px] px-3 sm:px-6">
          <div className="grid gap-5 sm:gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="relative min-h-[320px] overflow-hidden rounded-[22px] border border-wa-gray-100 bg-white shadow-[0_16px_52px_rgba(13,20,33,0.06)] sm:min-h-[430px] sm:rounded-[32px] sm:shadow-[0_22px_70px_rgba(13,20,33,0.08)]" data-cinema-reveal>
              <Image src={retailImage} alt="Retail store owner using a phone while helping customers" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 52vw" />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.92),rgba(255,255,255,0.42)_62%,rgba(255,255,255,0.18))]" />
              <div className="absolute inset-x-3 bottom-3 max-w-[440px] rounded-[20px] border border-wa-gray-100 bg-white/92 p-4 backdrop-blur sm:bottom-6 sm:left-6 sm:right-auto sm:rounded-[24px] sm:p-6">
                <h2 className="text-[26px] font-semibold leading-tight text-wa-gray-900 sm:text-[44px]">
                  Formal software for small business communication.
                </h2>
              </div>
            </div>
            <div data-cinema-reveal>
              <p className="text-sm font-semibold text-wa-blue-600">Product clarity</p>
              <h2 className="mt-3 text-[28px] font-semibold leading-tight text-wa-gray-900 sm:mt-4 sm:text-[48px] sm:leading-[1.12]">The style is clean because the job is serious.</h2>
              <p className="mt-3 text-body-sm leading-6 text-wa-gray-600 sm:mt-5 sm:text-lg sm:leading-8">
                White background, black text, blue actions, square grid structure, and direct copy make the app easier to trust and easier to understand.
              </p>
              <div className="mt-5 grid gap-2.5 sm:mt-8 sm:gap-3">
                {[
                  "One disciplined blue accent.",
                  "Business-first copy instead of technical noise.",
                  "Real setup steps instead of vague promises.",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl border border-wa-gray-100 bg-white p-3.5 sm:p-4">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-wa-blue-600" aria-hidden="true" />
                    <p className="text-body-sm leading-6 text-wa-gray-700 sm:text-base sm:leading-7">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="relative z-10 mx-auto max-w-[1200px] px-3 py-14 sm:px-6 sm:py-20" data-cinema-section>
        <SectionHeading
          eyebrow="Pricing"
          title="Clear plans with real reply limits."
          body="Users can see the monthly price, included replies, number limits, and what changes when the business grows."
        />
        <div className="mt-8 grid gap-4 sm:mt-12 sm:gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <FormalCard
              key={plan.name}
              className={cn("relative flex min-h-0 flex-col p-4 sm:min-h-[520px] sm:p-6", plan.featured && "border-wa-blue-600 ring-4 ring-wa-blue-50")}
              data-cinema-reveal
            >
              {plan.featured ? (
                <span className="absolute right-4 top-4 rounded-full bg-wa-blue-600 px-2.5 py-1 text-[10px] font-semibold text-white sm:right-5 sm:top-5 sm:px-3 sm:text-xs">Recommended</span>
              ) : null}
              <p className="text-sm font-semibold text-wa-blue-600">{plan.name}</p>
              <div className="mt-5 flex items-end gap-2">
                <p className="text-[40px] font-semibold leading-none text-wa-gray-900 sm:text-[52px]">{plan.price}</p>
                <p className="pb-2 text-sm text-wa-gray-500">/month</p>
              </div>
              <p className="mt-3 text-body-sm leading-6 text-wa-gray-600 sm:mt-4 sm:text-base sm:leading-7">{plan.description}</p>
              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-6 sm:gap-3">
                <div className="rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-3 sm:p-4">
                  <p className="text-xs text-wa-gray-400">Included</p>
                  <p className="mt-2 text-base font-semibold text-wa-gray-900">{plan.replies}</p>
                </div>
                <div className="rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-3 sm:p-4">
                  <p className="text-xs text-wa-gray-400">Numbers</p>
                  <p className="mt-2 text-base font-semibold text-wa-gray-900">{plan.numbers}</p>
                </div>
              </div>
              <div className="mt-4 space-y-2.5 sm:mt-6 sm:space-y-3">
                {plan.features.map((feature) => (
                  <p key={feature} className="flex items-start gap-2 text-sm leading-6 text-wa-gray-600">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-wa-blue-600" aria-hidden="true" />
                    {feature}
                  </p>
                ))}
              </div>
              <Link
                href={plan.href}
                className={cn(
                  "mt-5 inline-flex min-h-12 items-center justify-center rounded-full px-5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wa-blue-600 sm:mt-auto sm:min-h-14 sm:px-6",
                  plan.featured ? "bg-wa-blue-600 text-white hover:bg-[#0E47E8]" : "border border-wa-gray-200 bg-white text-wa-gray-900 hover:bg-wa-gray-50",
                )}
              >
                {plan.cta}
              </Link>
            </FormalCard>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-[1200px] px-3 pb-16 sm:px-6 sm:pb-24">
        <FormalCard className="overflow-hidden p-5 sm:p-10 lg:p-12">
          <div className="grid gap-6 sm:gap-10 lg:grid-cols-[1fr_0.72fr] lg:items-end">
            <div>
              <p className="text-sm font-semibold text-wa-blue-600">Ready to use kallem</p>
              <h2 className="mt-3 max-w-[760px] text-[30px] font-semibold leading-tight text-wa-gray-900 sm:mt-4 sm:text-[58px] sm:leading-[1.08]">
                Start with one number. Keep the owner in control.
              </h2>
              <p className="mt-4 max-w-[640px] text-body-sm leading-6 text-wa-gray-600 sm:mt-6 sm:text-lg sm:leading-8">
                Create the account, connect WhatsApp through the guided setup, then open the dashboard to manage replies.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <MagneticLink href="/signup" className="w-full bg-wa-blue-600 text-white shadow-[0_18px_44px_rgba(26,86,255,0.24)] hover:bg-[#0E47E8]">
                Create account
                <ArrowRight className="size-4" aria-hidden="true" />
              </MagneticLink>
              <MagneticLink href="/login" className="w-full border border-wa-gray-200 bg-white text-wa-gray-900 hover:bg-wa-gray-50">
                Sign in
              </MagneticLink>
            </div>
          </div>
        </FormalCard>
      </section>

      <footer className="relative z-10 border-t border-wa-gray-100 bg-white">
        <div className="mx-auto max-w-[1200px] px-3 py-8 sm:px-6 sm:py-12 lg:py-16">
          <div className="grid gap-7 sm:gap-10 lg:grid-cols-[1.15fr_1.6fr]">
            <div>
              <BrandLockup className="text-xl sm:text-2xl" />
              <p className="mt-3 max-w-[420px] text-body-sm leading-6 text-wa-gray-600 sm:mt-5 sm:text-base sm:leading-7">
                A formal AI WhatsApp assistant for small businesses. Connect a business number, automate replies, review conversations, and keep the owner in control.
              </p>
              <div className="mt-5 flex flex-col gap-2.5 sm:mt-6 sm:flex-row sm:gap-3">
                <Link
                  href="/signup"
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-wa-blue-600 px-5 text-sm font-semibold text-white shadow-[0_16px_42px_rgba(26,86,255,0.18)] transition hover:bg-[#0E47E8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wa-blue-600 sm:min-h-12"
                >
                  Start free
                </Link>
                <Link
                  href="/login"
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-wa-gray-200 bg-white px-5 text-sm font-semibold text-wa-gray-900 transition hover:bg-wa-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wa-blue-600 sm:min-h-12"
                >
                  Sign in
                </Link>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-3 sm:gap-8">
              {footerSections.map((section) => (
                <div key={section.title}>
                  <h3 className="text-sm font-semibold text-wa-gray-900">{section.title}</h3>
                  <ul className="mt-4 space-y-3">
                    {section.links.map((link) => (
                      <li key={link.label}>
                        <Link
                          href={link.href}
                          className="text-sm leading-6 text-wa-gray-600 transition hover:text-wa-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wa-blue-600"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-7 grid gap-3 border-y border-wa-gray-100 py-5 sm:mt-10 sm:py-6 md:grid-cols-3">
            {footerTrust.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-4">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-wa-blue-600" aria-hidden="true" />
                <p className="text-sm leading-6 text-wa-gray-700">{item}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-4 text-sm text-wa-gray-500 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <span>© 2026 {BRAND_NAME}. All rights reserved.</span>
              <span>Photography via Pexels.</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="rounded-full border border-wa-gray-100 bg-white px-3 py-1.5 text-xs font-semibold text-wa-gray-600">
                50 free replies
              </span>
              <span className="rounded-full border border-wa-gray-100 bg-white px-3 py-1.5 text-xs font-semibold text-wa-gray-600">
                Pro EGP 999/mo
              </span>
              <Link
                href="/billing"
                className="inline-flex items-center gap-2 rounded-full border border-wa-gray-100 bg-white px-3 py-1.5 text-xs font-semibold text-wa-gray-600 transition hover:border-wa-blue-100 hover:text-wa-blue-600"
              >
                <CreditCard className="size-3.5" aria-hidden="true" />
                Billing
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
