// FILE: src/components/shared/TopBar.tsx
"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: The new shell uses a compact fixed top bar so the AI control, not
 * navigation chrome, remains the dominant dashboard element.
 */
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart2,
  BookMarked,
  BookOpen,
  CreditCard,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  Menu,
  MessageSquareText,
  Package,
  RadioTower,
  ShieldCheck,
  ShoppingBag,
  UserPlus,
} from "lucide-react";

import { BrandLogo } from "@/components/shared/BrandLogo";
import { ProfileSheet } from "@/components/shared/ProfileSheet";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useAuthStore } from "@/store/authStore";
import type { PlanTier } from "@/types/subscription";
import { BRAND_NAME } from "@/lib/utils/brand";
import { cn } from "@/lib/utils";

export interface TopBarProps {
  userName?: string | null;
  userEmail?: string | null;
  planTier?: PlanTier;
  isAdmin?: boolean;
  onBilling?: () => void;
  onSignOut?: () => void;
}

function initialsFor(name?: string | null, email?: string | null) {
  const source = name || email || BRAND_NAME;
  return source.slice(0, 2).toUpperCase();
}

const appNavItems = [
  { href: "/dashboard", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/whatsapp", label: "واتساب", icon: RadioTower },
  { href: "/knowledge", label: "المعرفة", icon: BookOpen },
  { href: "/products", label: "المنتجات", icon: Package },
  { href: "/orders", label: "الطلبات", icon: ShoppingBag },
  { href: "/corrections", label: "تصحيحات", icon: BookMarked },
  { href: "/templates", label: "القوالب", icon: FileText },
  { href: "/broadcasts", label: "الحملات", icon: Megaphone },
  { href: "/leads", label: "العملاء", icon: UserPlus },
  { href: "/analytics", label: "التحليلات", icon: BarChart2 },
  { href: "/messages", label: "الرسائل", icon: MessageSquareText },
  { href: "/billing", label: "الفوترة", icon: CreditCard },
  { href: "/support", label: "الدعم", icon: LifeBuoy },
];

const mobilePrimaryHrefs = new Set(["/dashboard", "/whatsapp", "/messages", "/billing"]);

export function TopBar({ isAdmin = false, onBilling, onSignOut, planTier = "FREE", userEmail, userName }: TopBarProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const displayName = userName;
  const displayEmail = userEmail;
  const displayPlan = planTier;
  const navItems = isAdmin ? [...appNavItems, { href: "/admin", label: "الإدارة", icon: ShieldCheck }] : appNavItems;
  const mobilePrimaryItems = navItems.filter((item) => mobilePrimaryHrefs.has(item.href));

  function handleBilling() {
    if (onBilling) {
      onBilling();
      return;
    }

    router.push("/billing");
  }

  async function handleSignOut() {
    if (onSignOut) {
      onSignOut();
      return;
    }

    await fetch("/api/auth/logout", { method: "POST" });
    clearAuth();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-30 h-14 border-b border-wa-gray-100 bg-white/95 backdrop-blur-xl md:h-16">
        <div className="mx-auto flex h-full max-w-[1120px] items-center justify-between gap-3 px-3 sm:px-6">
          <BrandLogo wordmarkSize="sm" />
          <nav
            className="hidden max-w-[760px] items-center gap-1 overflow-x-auto rounded-full border border-wa-gray-100 bg-wa-gray-50 p-1 md:flex lg:max-w-[860px]"
            aria-label="تنقل التطبيق"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-body-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wa-blue-600",
                    active ? "bg-white text-wa-blue-600 shadow-[0_10px_28px_rgba(13,20,33,0.06)]" : "text-wa-gray-600 hover:bg-white hover:text-wa-gray-900",
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <button
            type="button"
            aria-label="فتح الحساب"
            onClick={() => setProfileOpen(true)}
            className="flex size-10 items-center justify-center rounded-full bg-wa-gray-50 text-[11px] font-semibold text-wa-gray-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-wa-blue-50 sm:text-label"
          >
            {initialsFor(displayName, displayEmail)}
          </button>
        </div>
      </header>
      <nav
        className="fixed inset-x-2 bottom-2 z-40 mx-auto grid max-w-[560px] grid-cols-5 gap-1 rounded-[22px] border border-wa-gray-100 bg-white/96 p-1 shadow-[0_14px_44px_rgba(13,20,33,0.16)] backdrop-blur-xl md:hidden"
        aria-label="تنقل التطبيق"
      >
        {mobilePrimaryItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-[54px] flex-col items-center justify-center gap-0.5 rounded-[16px] px-1 text-[10px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wa-blue-600",
                active ? "bg-wa-blue-50 text-wa-blue-600" : "text-wa-gray-500 hover:bg-wa-gray-50 hover:text-wa-gray-900",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="flex min-h-[54px] flex-col items-center justify-center gap-0.5 rounded-[16px] px-1 text-[10px] font-semibold text-wa-gray-500 transition hover:bg-wa-gray-50 hover:text-wa-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wa-blue-600"
        >
          <Menu className="size-4" aria-hidden="true" />
          المزيد
        </button>
      </nav>
      <BottomSheet open={menuOpen} title="القائمة" onClose={() => setMenuOpen(false)}>
        <div className="grid grid-cols-2 gap-2 pb-4 sm:grid-cols-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "flex min-h-[72px] items-center gap-3 rounded-2xl border p-3 text-body-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wa-blue-600",
                  active ? "border-wa-blue-200 bg-wa-blue-50 text-wa-blue-700" : "border-wa-gray-100 bg-white text-wa-gray-700 hover:bg-wa-gray-50",
                )}
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-wa-gray-50 text-wa-blue-600">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </BottomSheet>
      <ProfileSheet
        open={profileOpen}
        planTier={displayPlan}
        userEmail={displayEmail}
        userName={displayName}
        onBilling={handleBilling}
        onClose={() => setProfileOpen(false)}
        onSignOut={handleSignOut}
      />
    </>
  );
}
