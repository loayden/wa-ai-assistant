/*
 * [ROLE: QA ENGINEER]
 * Decision: Phase 7 tests focus on pure helpers and provider payload behavior,
 * keeping market features verifiable without live Meta, OpenAI, or Paymob calls.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { isFrancoArabic } from "@/lib/ai/franco";
import { parseOrderTag, stripOrderTag } from "@/lib/ai/order-extraction";
import { detectTopicFromText, findRoutingRuleForTopic } from "@/lib/ai/topic-routing";
import { createOrderPaymentLink, createOrderPaymentReference, parseOrderPaymentReference } from "@/lib/paymob/order-payment";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("voice and Franco-Arabic helpers", () => {
  it("detects common Egyptian Franco-Arabic without flagging regular Arabic", () => {
    expect(isFrancoArabic("3ayez 2 shawerma w cola")).toBe(true);
    expect(isFrancoArabic("عايز ٢ شاورما وكولا")).toBe(false);
  });
});

describe("order extraction helpers", () => {
  it("parses and strips hidden order tags before the reply is sent", () => {
    const reply = `تمام، طلبك 2 شاورما والإجمالي 180 جنيه.\n[[ORDER: { "items": [{ "name": "شاورما", "qty": 2, "unit_price": 9000 }], "subtotal": 18000 }]]`;

    expect(parseOrderTag(reply)).toEqual({
      items: [{ name: "شاورما", qty: 2, unit_price: 9000 }],
      subtotal: 18000,
      notes: undefined,
    });
    expect(stripOrderTag(reply)).toBe("تمام، طلبك 2 شاورما والإجمالي 180 جنيه.");
  });
});

describe("Paymob order payment links", () => {
  it("creates and parses stable order payment references", () => {
    const orderId = "00000000-0000-4000-8000-000000000001";
    const reference = createOrderPaymentReference(orderId);

    expect(parseOrderPaymentReference(reference)).toEqual({ orderId });
    expect(parseOrderPaymentReference("subscription:PRO:user-1:123")).toBeNull();
  });

  it("returns a Paymob hosted checkout URL from the intention API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ id: "intent_1", client_secret: "secret_123" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const link = await createOrderPaymentLink({
      order: {
        id: "00000000-0000-4000-8000-000000000001",
        subtotal: 15000,
        customerPhone: "201144999221",
      },
      businessName: "Kallem Store",
    });

    expect(link.url).toContain("https://accept.paymob.com/unifiedcheckout/");
    expect(link.url).toContain("clientSecret=secret_123");
    expect(link.reference).toContain("kallem-order:00000000-0000-4000-8000-000000000001");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://accept.paymob.com/v1/intention/",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });
});

describe("smart topic routing", () => {
  it("routes complaints to handoff rules and billing questions to notification rules", () => {
    const rules = [
      { topic: "complaint", keywords: [], action: "handoff", isActive: true },
      { topic: "billing", keywords: [], action: "notify_email", isActive: true },
    ];

    const complaintTopic = detectTopicFromText("الطلب اتأخر والتجربة وحشة");
    const billingTopic = detectTopicFromText("عايز أعرف الفاتورة والدفع");

    expect(complaintTopic).toBe("complaint");
    expect(findRoutingRuleForTopic({ message: "الطلب اتأخر والتجربة وحشة", rules, topic: complaintTopic })?.action).toBe("handoff");
    expect(billingTopic).toBe("billing");
    expect(findRoutingRuleForTopic({ message: "عايز أعرف الفاتورة والدفع", rules, topic: billingTopic })?.action).toBe("notify_email");
  });

  it("supports active custom keyword rules", () => {
    const rules = [
      { topic: "custom", keywords: ["vip"], action: "notify_whatsapp", isActive: true },
      { topic: "custom", keywords: ["ignore"], action: "handoff", isActive: false },
    ];

    expect(findRoutingRuleForTopic({ message: "this is a vip customer", rules, topic: "other" })?.action).toBe("notify_whatsapp");
    expect(findRoutingRuleForTopic({ message: "ignore this", rules, topic: "other" })).toBeNull();
  });
});
