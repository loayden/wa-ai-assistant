"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { captureMarketingAttributionFromUrl, sendMarketingEvent } from "@/lib/marketing/client-events";
import type { MarketingEventName } from "@/lib/marketing/events";

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

    const attribution = captureMarketingAttributionFromUrl();

    sendMarketingEvent("page_view", {
      path: `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ""}`,
      source: "route_change",
      ...attribution,
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
