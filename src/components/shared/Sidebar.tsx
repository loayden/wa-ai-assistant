// FILE: src/components/shared/Sidebar.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Dashboard navigation is a dense operational shell with mobile
 * disclosure, plan badge, and server-backed logout action.
 */
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BotMessageSquare,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Settings,
  Smartphone,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/uiStore";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/messages", label: "Messages", icon: MessageSquareText },
  { href: "/whatsapp", label: "WhatsApp", icon: Smartphone },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <BotMessageSquare className="size-5" aria-hidden="true" />
        </span>
        <span className="font-semibold">WA-AI Assistant</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                active && "bg-accent text-accent-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function Sidebar() {
  const open = useUiStore((state) => state.sidebarOpen);
  const setOpen = useUiStore((state) => state.setSidebarOpen);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const subscription = useSubscription();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    clearAuth();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-background lg:block">
        <SidebarContent />
      </aside>
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background px-4 lg:ml-64">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">
          <Menu className="size-5" aria-hidden="true" />
        </Button>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{subscription.user?.fullName || subscription.user?.email || "Account"}</p>
          <p className="truncate text-xs text-muted-foreground">{subscription.user?.email || "Signed in"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={subscription.planTier === "PRO" ? "success" : "secondary"}>{subscription.planTier}</Badge>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="size-4" aria-hidden="true" />
            Logout
          </Button>
        </div>
      </header>
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-foreground/20" aria-label="Close navigation" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-72 border-r bg-background shadow-lg">
            <div className="absolute right-3 top-3">
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close navigation">
                <X className="size-5" aria-hidden="true" />
              </Button>
            </div>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      ) : null}
    </>
  );
}
