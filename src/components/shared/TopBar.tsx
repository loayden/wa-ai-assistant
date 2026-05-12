// FILE: src/components/shared/TopBar.tsx
"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: The new shell uses a compact fixed top bar so the AI control, not
 * navigation chrome, remains the dominant dashboard element.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";

import { BrandLogo } from "@/components/shared/BrandLogo";
import { ProfileSheet } from "@/components/shared/ProfileSheet";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuthStore } from "@/store/authStore";
import type { PlanTier } from "@/types/subscription";

export interface TopBarProps {
  userName?: string | null;
  userEmail?: string | null;
  planTier?: PlanTier;
  onBilling?: () => void;
  onSignOut?: () => void;
}

function initialsFor(name?: string | null, email?: string | null) {
  const source = name || email || "kalm";
  return source.slice(0, 2).toUpperCase();
}

export function TopBar({ onBilling, onSignOut, planTier = "FREE", userEmail, userName }: TopBarProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const router = useRouter();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const subscription = useSubscription();
  const displayName = subscription.user?.fullName || userName;
  const displayEmail = subscription.user?.email || userEmail;
  const displayPlan = subscription.planTier || planTier;

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
      <header className="fixed inset-x-0 top-0 z-30 h-14 border-b border-wa-gray-100 bg-white">
        <div className="mx-auto flex h-full max-w-[480px] items-center justify-between px-4">
          <BrandLogo wordmarkSize="sm" />
          <button
            type="button"
            aria-label="Open profile"
            onClick={() => setProfileOpen(true)}
            className="flex size-8 items-center justify-center rounded-full bg-wa-gray-50 text-label font-medium text-wa-gray-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-wa-blue-50"
          >
            {initialsFor(displayName, displayEmail)}
          </button>
        </div>
      </header>
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
