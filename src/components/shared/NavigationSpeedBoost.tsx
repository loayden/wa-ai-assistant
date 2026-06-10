// FILE: src/components/shared/NavigationSpeedBoost.tsx
"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Route changes should feel instant even when a protected page needs
 * server data. This component warms internal routes on intent and shows an
 * immediate transition signal while Next.js streams the destination.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const DASHBOARD_ROUTES_TO_WARM = [
  "/dashboard",
  "/messages",
  "/connect",
  "/knowledge",
  "/products",
  "/orders",
  "/leads",
  "/analytics",
  "/billing",
  "/support",
];

const PENDING_TIMEOUT_MS = 8_000;

function findAnchor(target: EventTarget | null) {
  return target instanceof Element ? target.closest<HTMLAnchorElement>("a[href]") : null;
}

function getInternalRoute(anchor: HTMLAnchorElement | null) {
  if (!anchor) {
    return null;
  }

  if (anchor.target === "_blank" || anchor.hasAttribute("download")) {
    return null;
  }

  const url = new URL(anchor.href, window.location.href);

  if (url.origin !== window.location.origin || url.pathname.startsWith("/api")) {
    return null;
  }

  const currentRoute = `${window.location.pathname}${window.location.search}`;
  const nextRoute = `${url.pathname}${url.search}`;

  if (nextRoute === currentRoute && url.hash) {
    return null;
  }

  return nextRoute;
}

export function NavigationSpeedBoost() {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const warmedRoutesRef = useRef(new Set<string>());

  const clearPendingTimer = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const markPending = useCallback((route: string) => {
    setPendingRoute(route);
    clearPendingTimer();
    timeoutRef.current = window.setTimeout(() => setPendingRoute(null), PENDING_TIMEOUT_MS);
  }, [clearPendingTimer]);

  const warmRoute = useCallback((route: string | null) => {
    if (!route || warmedRoutesRef.current.has(route)) {
      return;
    }

    warmedRoutesRef.current.add(route);
    router.prefetch(route);
  }, [router]);

  useEffect(() => {
    setPendingRoute(null);
    clearPendingTimer();

    return clearPendingTimer;
  }, [clearPendingTimer, pathname]);

  useEffect(() => {
    if (!pathname.startsWith("/dashboard") && !DASHBOARD_ROUTES_TO_WARM.includes(pathname)) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      DASHBOARD_ROUTES_TO_WARM.forEach(warmRoute);
    }, 450);

    return () => window.clearTimeout(timeoutId);
  }, [pathname, warmRoute]);

  useEffect(() => {
    function handleIntent(event: Event) {
      const route = getInternalRoute(findAnchor(event.target));

      if (route) {
        window.setTimeout(() => {
          warmRoute(route);
        }, 80);
      }
    }

    function handleProgrammaticNavigation(event: Event) {
      const detail = event instanceof CustomEvent ? event.detail : null;
      const route = typeof detail?.href === "string" ? detail.href : null;

      if (route) {
        warmRoute(route);
        markPending(route);
      }
    }

    document.addEventListener("pointerover", handleIntent, { capture: true, passive: true });
    document.addEventListener("touchstart", handleIntent, { capture: true, passive: true });
    document.addEventListener("focusin", handleIntent, { capture: true });
    window.addEventListener("kallem:navigation-start", handleProgrammaticNavigation);

    return () => {
      document.removeEventListener("pointerover", handleIntent, { capture: true });
      document.removeEventListener("touchstart", handleIntent, { capture: true });
      document.removeEventListener("focusin", handleIntent, { capture: true });
      window.removeEventListener("kallem:navigation-start", handleProgrammaticNavigation);
    };
  }, [markPending, warmRoute]);

  useEffect(() => {
    document.documentElement.toggleAttribute("data-route-pending", Boolean(pendingRoute));

    return () => document.documentElement.removeAttribute("data-route-pending");
  }, [pendingRoute]);

  if (!pendingRoute) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[90] h-1 overflow-hidden bg-wa-blue-50/70" aria-hidden="true">
      <div className="kallem-route-progress h-full rounded-full bg-gradient-to-r from-wa-blue-600 via-[#6EA8FF] to-wa-blue-600 shadow-[0_0_22px_rgba(26,86,255,0.38)]" />
    </div>
  );
}
