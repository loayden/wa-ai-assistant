"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import type { MarketingEventName, MarketingEventPayload } from "@/lib/marketing/events";

const publicPathPrefixes = [
  "/",
  "/blog",
  "/pricing",
  "/security",
  "/compare",
  "/features",
  "/instagram-messenger-ai",
  "/whatsapp-ai",
  "/signup",
  "/login",
];

function isPublicMarketingPath(pathname: string) {
  if (pathname === "/") return true;
  return publicPathPrefixes.some((prefix) => prefix !== "/" && (pathname === prefix || pathname.startsWith(`${prefix}/`)));
}

function getClientId() {
  const key = "kallem_marketing_client_id";
  const fallback = crypto.randomUUID();
  let existing: string | null = null;

  try {
    existing = window.localStorage.getItem(key);

    if (existing) {
      return existing;
    }

    window.localStorage.setItem(key, fallback);
  } catch {
    return fallback;
  }

  return fallback;
}

function getViewport() {
  return `${window.innerWidth}x${window.innerHeight}`;
}

function sendMarketingEvent(eventName: MarketingEventName, data: Partial<MarketingEventPayload> = {}) {
  const payload: MarketingEventPayload = {
    eventName,
    clientId: getClientId(),
    path: window.location.pathname + window.location.search,
    referrer: document.referrer || undefined,
    viewport: getViewport(),
    ...data,
  };
  const body = JSON.stringify(payload);

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/marketing/events", blob);
    return;
  }

  void fetch("/api/marketing/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  });
}

function getEventNameForLink(anchor: HTMLAnchorElement): MarketingEventName {
  const href = anchor.getAttribute("href") ?? "";
  const label = anchor.textContent?.trim().toLowerCase() ?? "";

  if (href.startsWith("/blog/")) return "blog_article_click";
  if (href.startsWith("/pricing") || label.includes("pro") || label.includes("business")) return "pricing_plan_click";
  if (href.startsWith("/signup") || href.startsWith("/login") || href.includes("next=")) return "cta_click";
  return "public_nav_click";
}

export function MarketingEventTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isPublicMarketingPath(pathname)) {
      return;
    }

    sendMarketingEvent("page_view", {
      path: `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ""}`,
      source: "route_change",
    });
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!isPublicMarketingPath(window.location.pathname)) {
        return;
      }

      const target = event.target instanceof Element ? event.target.closest("a") : null;

      if (!(target instanceof HTMLAnchorElement)) {
        return;
      }

      const href = target.getAttribute("href") ?? "";

      if (!href.startsWith("/") && !href.startsWith("#")) {
        return;
      }

      sendMarketingEvent(getEventNameForLink(target), {
        label: target.textContent?.trim().replace(/\s+/g, " ").slice(0, 120),
        target: href,
        source: "link_click",
      });
    };

    document.addEventListener("click", handleClick, { capture: true });

    return () => document.removeEventListener("click", handleClick, { capture: true });
  }, []);

  return null;
}
