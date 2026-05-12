// FILE: src/app/page.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: The upgraded landing page strips the story down to setup speed,
 * always-on replies, and user control using only three sections.
 */
import Link from "next/link";
import { Bot, CheckCircle, Clock, ToggleLeft } from "lucide-react";

import { BrandLogo } from "@/components/shared/BrandLogo";
import { buttonVariants } from "@/components/ui/button";
import { BRAND_NAME } from "@/lib/utils/brand";
import { cn } from "@/lib/utils";

const features = [
  {
    title: "60-second setup",
    description: "Enter your number, verify, done.",
    icon: Clock,
  },
  {
    title: "AI replies instantly",
    description: "Customers get answers 24/7.",
    icon: Bot,
  },
  {
    title: "You stay in control",
    description: "Pause anytime with one tap.",
    icon: ToggleLeft,
  },
];

const plans = [
  {
    name: "FREE",
    price: "$0",
    cta: "Get started",
    href: "/signup",
    variant: "outline" as const,
    features: ["50 AI replies/month", "1 WhatsApp number", "Default assistant voice", "Message history", "One-tap pause"],
  },
  {
    name: "PRO",
    price: "$19",
    cta: "Upgrade to PRO",
    href: "/signup",
    variant: "default" as const,
    featured: true,
    features: ["2,000 included replies/month", "3 WhatsApp numbers", "Custom AI instructions", "Priority support", "Tracked overage after included replies"],
  },
  {
    name: "BUSINESS",
    price: "$49",
    cta: "Choose BUSINESS",
    href: "/signup",
    variant: "outline" as const,
    features: ["10,000 included replies/month", "10 WhatsApp numbers", "Custom AI instructions", "Priority support", "Tracked overage after included replies"],
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-wa-gray-900">
      <section className="flex min-h-screen items-center bg-white py-20">
        <div className="mx-auto max-w-[560px] px-4 text-center">
          <BrandLogo className="mb-8" layout="stacked" showTagline wordmarkSize="lg" />
          <h1 className="whitespace-pre-line text-display font-medium text-wa-gray-900">
            {"Your WhatsApp,\nnow runs itself."}
          </h1>
          <p className="mx-auto mt-4 max-w-[440px] text-body-lg text-wa-gray-600">
            AI replies to your customers 24/7. Set up in 60 seconds. No technical knowledge needed.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/signup" className={cn(buttonVariants(), "w-full sm:w-auto sm:min-w-[200px]")}>
              Get started free
            </Link>
            <Link href="#features" className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto sm:min-w-[200px]")}>
              See how it works
            </Link>
          </div>
        </div>
      </section>
      <section id="features" className="mx-auto max-w-[760px] px-4 py-20">
        <p className="mb-3 text-center text-label font-medium uppercase tracking-widest text-wa-gray-400">How it works</p>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <article key={feature.title}>
                <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-wa-blue-50 text-wa-blue-600">
                  <Icon className="size-5" aria-hidden="true" />
                </div>
                <h3 className="text-h3 font-medium text-wa-gray-900">{feature.title}</h3>
                <p className="mt-2 text-body text-wa-gray-600">{feature.description}</p>
              </article>
            );
          })}
        </div>
      </section>
      <section id="pricing" className="mx-auto max-w-[960px] px-4 py-20">
        <p className="mb-6 text-center text-label font-medium uppercase tracking-widest text-wa-gray-400">Pricing</p>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={cn(
                "relative rounded-xl border border-wa-gray-100 bg-white p-5",
                plan.featured && "border-2 border-wa-blue-600",
              )}
            >
              {plan.featured ? (
                <span className="absolute -top-3 left-5 rounded-full bg-wa-blue-50 px-3 py-1 text-label font-medium uppercase tracking-widest text-wa-blue-800">
                  Most popular
                </span>
              ) : null}
              <h2 className="text-h2 font-medium text-wa-gray-900">{plan.name}</h2>
              <p className="mt-4">
                <span className="text-display font-semibold text-wa-gray-900">{plan.price}</span>
                <span className="ml-1 text-body-sm text-wa-gray-600">/month</span>
              </p>
              <div className="mt-5 space-y-3">
                {plan.features.map((feature) => (
                  <p key={feature} className="flex items-center gap-2 text-body text-wa-gray-600">
                    <CheckCircle className="size-4 text-wa-blue-600" aria-hidden="true" />
                    {feature}
                  </p>
                ))}
              </div>
              <Link href={plan.href} className={cn(buttonVariants({ variant: plan.variant }), "mt-6 w-full")}>
                {plan.cta}
              </Link>
            </article>
          ))}
        </div>
      </section>
      <footer className="py-8 text-center text-micro text-wa-gray-400">
        © 2026 {BRAND_NAME}. Built for small business.
      </footer>
    </main>
  );
}
