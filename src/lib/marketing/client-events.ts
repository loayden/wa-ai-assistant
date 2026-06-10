"use client";

import type { MarketingEventName, MarketingEventPayload } from "@/lib/marketing/events";

const clientIdStorageKey = "kallem_marketing_client_id";
const attributionStorageKey = "kallem_marketing_attribution";

type MarketingAttribution = Pick<
  MarketingEventPayload,
  | "landingPage"
  | "firstReferrer"
  | "utmSource"
  | "utmMedium"
  | "utmCampaign"
  | "utmContent"
  | "utmTerm"
  | "gclid"
  | "fbclid"
>;

function getClientId() {
  const fallback = crypto.randomUUID();
  let existing: string | null = null;

  try {
    existing = window.localStorage.getItem(clientIdStorageKey);

    if (existing) {
      return existing;
    }

    window.localStorage.setItem(clientIdStorageKey, fallback);
  } catch {
    return fallback;
  }

  return fallback;
}

function getViewport() {
  return `${window.innerWidth}x${window.innerHeight}`;
}

export function getStoredMarketingAttribution(): MarketingAttribution {
  try {
    const raw = window.localStorage.getItem(attributionStorageKey);

    if (!raw) {
      return {};
    }

    return JSON.parse(raw) as MarketingAttribution;
  } catch {
    return {};
  }
}

function setStoredAttribution(attribution: MarketingAttribution) {
  try {
    window.localStorage.setItem(attributionStorageKey, JSON.stringify(attribution));
  } catch {
    // Attribution should never block the app in private or locked-down browsers.
  }
}

function cleanParam(value: string | null) {
  return value?.trim().slice(0, 160) || undefined;
}

export function captureMarketingAttributionFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const existing = getStoredMarketingAttribution();
  const next: MarketingAttribution = {
    landingPage: existing.landingPage ?? `${window.location.pathname}${window.location.search}`,
    firstReferrer: existing.firstReferrer ?? (document.referrer || undefined),
    utmSource: existing.utmSource ?? cleanParam(params.get("utm_source")),
    utmMedium: existing.utmMedium ?? cleanParam(params.get("utm_medium")),
    utmCampaign: existing.utmCampaign ?? cleanParam(params.get("utm_campaign")),
    utmContent: existing.utmContent ?? cleanParam(params.get("utm_content")),
    utmTerm: existing.utmTerm ?? cleanParam(params.get("utm_term")),
    gclid: existing.gclid ?? cleanParam(params.get("gclid")),
    fbclid: existing.fbclid ?? cleanParam(params.get("fbclid")),
  };

  setStoredAttribution(next);
  return next;
}

export function sendMarketingEvent(eventName: MarketingEventName, data: Partial<MarketingEventPayload> = {}) {
  const payload: MarketingEventPayload = {
    eventName,
    clientId: getClientId(),
    path: window.location.pathname + window.location.search,
    referrer: document.referrer || undefined,
    viewport: getViewport(),
    ...getStoredMarketingAttribution(),
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
