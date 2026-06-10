// FILE: src/components/shared/TopBar.tsx
"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: The new shell uses a compact fixed top bar so the AI control, not
 * navigation chrome, remains the dominant dashboard element.
 */
import { useEffect, useState } from "react";
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

import { LogoMark } from "@/components/shared/LogoMark";
import { ProfileSheet } from "@/components/shared/ProfileSheet";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useFastNavigation } from "@/hooks/useFastNavigation";
import { useLaunchReadiness } from "@/hooks/useReadiness";
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
  { href: "/readiness", label: "جاهزية الإطلاق", icon: ShieldCheck },
  { href: "/connect", label: "القنوات", icon: RadioTower },
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

const mobilePrimaryHrefs = new Set(["/dashboard", "/connect", "/messages", "/billing"]);
const desktopPrimaryHrefs = new Set(["/dashboard", "/readiness", "/connect", "/knowledge", "/products", "/orders", "/messages", "/billing"]);

function readinessDotClass(score?: number) {
  if (score === undefined) {
    return "bg-wa-gray-400";
  }

  if (score >= 90) {
    return "bg-wa-success";
  }

  if (score >= 60) {
    return "bg-wa-warning";
  }

  return "bg-wa-error";
}

function ReadinessDot({ score }: { score?: number }) {
  return (
    <span
      className={cn("size-2 rounded-full", readinessDotClass(score))}
      aria-label={score === undefined ? "لم يتم فحص جاهزية الإطلاق بعد" : `درجة جاهزية الإطلاق ${score}%`}
      title={score === undefined ? "جاهزية الإطلاق" : `جاهزية الإطلاق ${score}%`}
    />
  );
}

export function TopBar({ isAdmin = false, onBilling, onSignOut, planTier = "FREE", userEmail, userName }: TopBarProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const fastNavigation = useFastNavigation();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const readinessQuery = useLaunchReadiness("light", Boolean(userEmail));
  const readinessScore = readinessQuery.data?.score;
  const displayName = userName;
  const displayEmail = userEmail;
  const displayPlan = planTier;
  const navItems = isAdmin ? [...appNavItems, { href: "/admin", label: "الإدارة", icon: ShieldCheck }] : appNavItems;
  const mobilePrimaryItems = navItems.filter((item) => mobilePrimaryHrefs.has(item.href));
  const desktopPrimaryItems = navItems.filter((item) => desktopPrimaryHrefs.has(item.href) || (isAdmin && item.href === "/admin"));
  const desktopMoreItems = navItems.filter((item) => !desktopPrimaryItems.some((primaryItem) => primaryItem.href === item.href));
  const activeItem = navItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)) ?? navItems[0];

  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  function handleBilling() {
    if (onBilling) {
      onBilling();
      return;
    }

    fastNavigation.push("/billing");
  }

  async function handleSignOut() {
    if (onSignOut) {
      onSignOut();
      return;
    }

    await fetch("/api/auth/logout", { method: "POST" });
    clearAuth();
    fastNavigation.push("/login");
    router.refresh();
  }

  return (
    <>
      <aside className="glass-surface fixed bottom-3 left-3 top-3 z-40 hidden w-[72px] flex-col items-center gap-3 rounded-[28px] p-2 md:flex">
        <Link
          href="/dashboard"
          aria-label="الرئيسية"
          className="flex size-12 items-center justify-center rounded-[18px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wa-blue-600"
        >
          <LogoMark size="lg" />
        </Link>
        <nav className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto py-1" aria-label="تنقل التطبيق">
          {desktopPrimaryItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex size-11 items-center justify-center rounded-[17px] text-wa-gray-500 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wa-blue-600",
                  active
                    ? "bg-wa-blue-600 text-white shadow-[0_14px_34px_rgba(26,86,255,0.28)]"
                    : "hover:bg-white/80 hover:text-wa-gray-900",
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
                {item.href === "/readiness" ? (
                  <span className="absolute -left-0.5 -top-0.5 rounded-full border-2 border-white">
                    <ReadinessDot score={readinessScore} />
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          title="المزيد"
          aria-label="المزيد"
          onClick={() => setMenuOpen(true)}
          className={cn(
            "flex size-11 items-center justify-center rounded-[17px] text-wa-gray-500 transition hover:bg-white/80 hover:text-wa-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wa-blue-600",
            desktopMoreItems.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)) && "bg-white/90 text-wa-blue-600 shadow-[0_10px_28px_rgba(4,44,83,0.10)]",
          )}
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
      </aside>
      <header className="fixed inset-x-2 top-2 z-30 sm:top-3 sm:px-2 md:left-[92px] md:right-4 md:px-0">
        <div className="glass-surface mx-auto flex h-14 max-w-[1360px] items-center justify-between gap-3 rounded-[22px] px-3 md:h-16 md:rounded-[26px] sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/dashboard" className="hidden sm:inline-flex" aria-label="الرئيسية">
              <LogoMark size="md" />
            </Link>
            <span className="hidden h-6 w-px bg-white/70 sm:block" aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate text-body-sm font-semibold text-wa-gray-900">{activeItem?.label ?? "kallem"}</p>
              <p className="hidden truncate text-label font-semibold uppercase tracking-widest text-wa-gray-500 sm:block">
                صندوق موحد لواتساب وإنستجرام وماسنجر
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <span className="rounded-full border border-white/70 bg-white/60 px-3 py-1.5 text-label font-semibold uppercase tracking-widest text-wa-gray-600">
              {displayPlan}
            </span>
            <Link
              href="/readiness"
              className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/70 bg-white/60 px-3 text-body-sm font-semibold text-wa-gray-700 transition hover:bg-white/90"
            >
              <ReadinessDot score={readinessScore} />
              الجاهزية
            </Link>
          </div>
          <button
            type="button"
            aria-label="فتح الحساب"
            onClick={() => setProfileOpen(true)}
            className="glass-control flex size-10 items-center justify-center rounded-full text-[11px] font-semibold text-wa-gray-700 transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70 sm:text-label"
          >
            {initialsFor(displayName, displayEmail)}
          </button>
        </div>
      </header>
      <nav
        className="glass-surface fixed inset-x-2 bottom-2 z-40 mx-auto grid max-w-[560px] grid-cols-5 gap-1 rounded-[22px] p-1 md:hidden"
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
                active ? "bg-white/90 text-wa-blue-600 shadow-[0_10px_28px_rgba(4,44,83,0.10)]" : "text-wa-gray-500 hover:bg-white/72 hover:text-wa-gray-900",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {item.label}
              {item.href === "/readiness" ? <ReadinessDot score={readinessScore} /> : null}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="flex min-h-[54px] flex-col items-center justify-center gap-0.5 rounded-[16px] px-1 text-[10px] font-semibold text-wa-gray-500 transition hover:bg-white/72 hover:text-wa-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wa-blue-600"
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
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate">{item.label}</span>
                  {item.href === "/readiness" ? <ReadinessDot score={readinessScore} /> : null}
                </span>
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
