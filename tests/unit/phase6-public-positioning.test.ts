import { describe, expect, it } from "vitest";

import {
  comparisonPages,
  featurePages,
  getPublicPaymentModeCopy,
  getPublicPlanCards,
  publicMarketingRoutes,
} from "@/lib/marketing/public-positioning";
import { PLAN_LIMITS } from "@/types/subscription";

describe("phase 6 public positioning", () => {
  it("exposes the required public conversion pages", () => {
    expect(Object.values(publicMarketingRoutes)).toEqual([
      "/features/whatsapp",
      "/features/instagram",
      "/features/ai",
      "/features/inbox",
      "/pricing",
      "/security",
      "/compare/respond-io",
      "/compare/whatschimp",
    ]);
  });

  it("keeps public pricing synchronized with billing plan limits", () => {
    const plans = getPublicPlanCards();

    expect(plans).toHaveLength(3);
    expect(plans.map((plan) => plan.tier)).toEqual(["FREE", "PRO", "BUSINESS"]);

    for (const plan of plans) {
      const limits = PLAN_LIMITS[plan.tier];

      expect(plan.replyLimit).toContain(limits.includedRepliesPerMonth.toLocaleString("en-US"));
      expect(plan.channelLimit).toContain(limits.maxConnections.toLocaleString("en-US"));
      expect(plan.priceLabel).toContain(limits.monthlyPriceEgp === 0 ? "مجانًا" : limits.monthlyPriceEgp.toLocaleString("en-US"));
    }
  });

  it("does not present Paymob checkout as live when keys are test or missing", () => {
    expect(getPublicPaymentModeCopy("live").title).toContain("الإنتاجي");
    expect(getPublicPaymentModeCopy("test").body).toContain("يوقف checkout");
    expect(getPublicPaymentModeCopy("missing").body).toContain("لن تفتح");
  });

  it("positions competitor pages around clarity instead of cloning competitors", () => {
    expect(comparisonPages.respondio.competitorName).toBe("respond.io");
    expect(comparisonPages.whatchimp.competitorName).toBe("WhatChimp");
    expect(comparisonPages.respondio.rows.some((row) => row.kallem.includes("Arabic-first"))).toBe(true);
    expect(comparisonPages.whatchimp.rows.some((row) => row.kallem.includes("test/live"))).toBe(true);
  });

  it("exposes Phase 8 feature pages for AI quality and the unified inbox", () => {
    expect(featurePages.ai.title).toContain("بيانات نشاطك");
    expect(featurePages.inbox.highlights.some((highlight) => highlight.includes("أسباب فشل"))).toBe(true);
  });
});
