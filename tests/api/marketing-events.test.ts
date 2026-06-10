import { describe, expect, it } from "vitest";

import { POST } from "@/app/api/marketing/events/route";

function createRequest(body: unknown) {
  return new Request("http://localhost:3000/api/marketing/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("marketing events endpoint", () => {
  it("accepts safe public marketing events without requiring analytics credentials", async () => {
    const response = await POST(
      createRequest({
        eventName: "cta_click",
        clientId: "test-client-123",
        path: "/pricing",
        label: "ابدأ Pro",
        target: "/signup?next=%2Fbilling",
        source: "link_click",
        viewport: "1440x900",
        landingPage: "/?utm_source=facebook&utm_campaign=launch",
        firstReferrer: "https://instagram.com/",
        utmSource: "facebook",
        utmMedium: "paidsocial",
        utmCampaign: "launch",
        utmContent: "arabic-ai",
        utmTerm: "whatsapp ai",
        fbclid: "test_fbclid",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ accepted: true, forwarded: false });
  });

  it("rejects unknown marketing event names", async () => {
    const response = await POST(
      createRequest({
        eventName: "password_submitted",
        clientId: "test-client-123",
        path: "/login",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.success).toBe(false);
  });
});
