// FILE: src/app/page.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Landing content presents the product workflow directly, with a
 * restrained SaaS interface preview instead of decorative illustration.
 */
import Link from "next/link";
import { Bot, Check, History, PlugZap, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/shared/Navbar";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <section className="border-b bg-muted/30">
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div className="flex flex-col gap-7">
            <div className="flex flex-col gap-5">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-normal text-foreground sm:text-5xl lg:text-6xl">
                AI WhatsApp replies for businesses that cannot miss a message
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                Connect WhatsApp Business, set your assistant behavior, and let WA-AI Assistant handle first-response conversations with tenant-isolated history and subscription controls.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className={cn(buttonVariants({ size: "lg" }))}>
                Get Started
              </Link>
              <Link href="/login" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
                Login
              </Link>
            </div>
          </div>
          <div className="rounded-xl border bg-background shadow-sm">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <p className="font-medium">Support Inbox</p>
                <p className="text-sm text-muted-foreground">Auto-reply enabled</p>
              </div>
              <Badge variant="success">PRO</Badge>
            </div>
            <div className="grid gap-0 md:grid-cols-[220px_1fr]">
              <div className="hidden border-r p-4 md:block">
                {["New lead", "Order question", "Store hours"].map((item, index) => (
                  <div key={item} className={cn("rounded-md px-3 py-2 text-sm", index === 0 && "bg-accent")}>
                    {item}
                  </div>
                ))}
              </div>
              <div className="flex min-h-[360px] flex-col gap-4 p-5">
                <div className="max-w-[75%] rounded-lg bg-muted px-4 py-3 text-sm">
                  Hi, do you deliver today and how much does it cost?
                </div>
                <div className="ml-auto max-w-[82%] rounded-lg bg-primary px-4 py-3 text-sm text-primary-foreground">
                  Yes, we deliver today. Standard delivery is available until 7 PM. Share your area and I can confirm the exact fee.
                </div>
                <div className="mt-auto grid gap-3 rounded-lg border p-4 sm:grid-cols-3">
                  <div>
                    <p className="text-2xl font-semibold">98%</p>
                    <p className="text-xs text-muted-foreground">reply success</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">1.8s</p>
                    <p className="text-xs text-muted-foreground">avg response</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">842</p>
                    <p className="text-xs text-muted-foreground">monthly replies</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-normal">Everything needed for automated first response</h2>
          <p className="mt-3 text-muted-foreground">Designed for businesses that need speed, accountability, and straightforward setup.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { title: "AI Replies", icon: Bot, text: "Generate concise, on-brand replies from your business prompt and customer message." },
            { title: "Message History", icon: History, text: "Track inbound, outbound, failed, ignored, and replied messages in one tenant-scoped inbox." },
            { title: "Easy Setup", icon: PlugZap, text: "Connect WhatsApp Cloud API credentials or use mock mode while your Meta app is pending." },
          ].map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title}>
                <CardHeader>
                  <Icon className="size-5 text-primary" aria-hidden="true" />
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.text}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>
      <section id="pricing" className="border-y bg-muted/30">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-20 sm:px-6 md:grid-cols-2 lg:px-8">
          <Card>
            <CardHeader>
              <CardTitle>FREE</CardTitle>
              <CardDescription>Validate automation with one WhatsApp number.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {["50 AI replies/month", "1 WhatsApp number", "Default assistant prompt"].map((item) => (
                <p key={item} className="flex items-center gap-2 text-sm">
                  <Check className="size-4 text-primary" aria-hidden="true" />
                  {item}
                </p>
              ))}
              <Link href="/signup" className={cn(buttonVariants(), "mt-3")}>
                Start Free
              </Link>
            </CardContent>
          </Card>
          <Card className="border-primary">
            <CardHeader>
              <CardTitle>PRO</CardTitle>
              <CardDescription>Scale automated support with more control.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {["Unlimited AI replies", "3 WhatsApp numbers", "Custom prompt", "Priority support"].map((item) => (
                <p key={item} className="flex items-center gap-2 text-sm">
                  <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
                  {item}
                </p>
              ))}
              <Link href="/signup" className={cn(buttonVariants(), "mt-3")}>
                Upgrade Ready
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>
      <footer className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>© 2026 WA-AI Assistant</p>
        <div className="flex gap-4">
          <Link href="/login">Login</Link>
          <Link href="/signup">Get Started</Link>
          <Link href="/messages">Messages</Link>
        </div>
      </footer>
    </main>
  );
}
