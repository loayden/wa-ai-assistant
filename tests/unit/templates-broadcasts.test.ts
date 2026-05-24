/*
 * [ROLE: QA ENGINEER]
 * Decision: Phase 5 helpers are tested without Meta calls so payload shape,
 * template variables, and campaign safety limits stay deterministic.
 */
import { describe, expect, it } from "vitest";

import { BROADCAST_DELAY_MS, normalizePhoneForSend, parseRecipientLines } from "@/lib/broadcasts/utils";
import {
  buildMetaTemplateComponents,
  extractTemplateVariables,
  languageCodeForTemplate,
  maskTemplateVariables,
  normalizeTemplateName,
} from "@/lib/templates/meta";
import { PLAN_LIMITS } from "@/types/subscription";

describe("template helpers", () => {
  it("normalizes template names for Meta", () => {
    expect(normalizeTemplateName("Follow Up Offer!")).toBe("follow_up_offer");
    expect(normalizeTemplateName("  عرض متابعة  ")).toBe("");
  });

  it("builds the expected Meta template components", () => {
    expect(
      buildMetaTemplateComponents({
        headerText: "Order update",
        bodyText: "Hello {{1}}, your order {{2}} is ready.",
        footerText: "Reply any time",
        buttonText: "Track order",
        buttonUrl: "https://kallem.vercel.app",
      }),
    ).toEqual([
      { type: "HEADER", format: "TEXT", text: "Order update" },
      { type: "BODY", text: "Hello {{1}}, your order {{2}} is ready." },
      { type: "FOOTER", text: "Reply any time" },
      {
        type: "BUTTONS",
        buttons: [{ type: "URL", text: "Track order", url: "https://kallem.vercel.app" }],
      },
    ]);
  });

  it("extracts and masks ordered template variables", () => {
    const body = "مرحباً {{2}}، كودك {{1}}. {{2}}";

    expect(extractTemplateVariables(body)).toEqual([1, 2]);
    expect(maskTemplateVariables(body)).toBe("مرحباً [متغير 2]، كودك [متغير 1]. [متغير 2]");
  });

  it("maps template language values to WhatsApp language codes", () => {
    expect(languageCodeForTemplate("ar")).toBe("ar");
    expect(languageCodeForTemplate("en")).toBe("en_US");
  });
});

describe("broadcast helpers", () => {
  it("parses recipient lines without adding a CSV dependency", () => {
    expect(parseRecipientLines("+20 114 499 9221, Loay\n201000000000")).toEqual([
      { phone: "201144999221", name: "Loay" },
      { phone: "201000000000", name: undefined },
    ]);
  });

  it("normalizes WhatsApp phone numbers for sending", () => {
    expect(normalizePhoneForSend("+20 (114) 499-9221")).toBe("201144999221");
  });

  it("keeps broadcast sends rate-limited by default", () => {
    expect(BROADCAST_DELAY_MS).toBe(1200);
  });

  it("keeps multi-number limits aligned with plan entitlements", () => {
    expect(PLAN_LIMITS.FREE.maxConnections).toBe(1);
    expect(PLAN_LIMITS.PRO.maxConnections).toBe(3);
    expect(PLAN_LIMITS.BUSINESS.maxConnections).toBe(10);
  });
});
