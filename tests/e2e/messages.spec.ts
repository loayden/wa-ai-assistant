// FILE: tests/e2e/messages.spec.ts
/*
 * [ROLE: QA ENGINEER]
 * Decision: Messages E2E tests use the real UI flow with mocked API responses
 * so filtering, pagination, and mock inbound sends remain browser-tested.
 */
import { expect, test, type Page } from "@playwright/test";

const AUTH_BYPASS_HEADER = { "x-e2e-auth-bypass": process.env.E2E_AUTH_BYPASS_SECRET ?? "playwright-secret" };

type MockMessage = {
  id: string;
  createdAt: string;
  direction: "INBOUND" | "OUTBOUND";
  fromNumber: string;
  toNumber: string;
  bodyText: string;
  status: "REPLIED";
  aiReplyText: string | null;
  connection: { id: string; displayName: string; phoneNumberId: string };
};

async function mockSharedApis(page: Page, messages: MockMessage[]) {
  await page.route("**/api/settings", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          settings: {
            systemPrompt: "Reply as {businessName}.",
            autoReplyEnabled: true,
            language: "en",
            businessName: "Acme",
            businessContext: null,
            fallbackMessage: null,
            maxReplyLength: 300,
          },
          user: {
            id: "user-1",
            email: "owner@example.com",
            fullName: "Owner Name",
            avatarUrl: null,
            planTier: "FREE",
            subscriptionStatus: "INACTIVE",
            monthlyReplyCount: 0,
            replyCountResetAt: new Date().toISOString(),
            stripeCustomerId: null,
            stripeSubscriptionId: null,
          },
        },
      }),
    });
  });
  await page.route("**/api/whatsapp/connect", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          connections: [
            {
              id: "connection-1",
              phoneNumberId: "1234567890",
              businessAccountId: "9876543210",
              accessTokenMasked: "********",
              displayName: "Support",
              isActive: true,
              isVerified: true,
            },
          ],
        },
      }),
    });
  });
  await page.route("**/api/messages**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const pageNumber = Number(requestUrl.searchParams.get("page") ?? "1");
    const limit = Number(requestUrl.searchParams.get("limit") ?? "20");
    const offset = (pageNumber - 1) * limit;

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: messages.slice(offset, offset + limit),
        meta: { total: messages.length, page: pageNumber, limit },
      }),
    });
  });
}

test("messages page loads and shows empty state", async ({ page }) => {
  await page.setExtraHTTPHeaders(AUTH_BYPASS_HEADER);
  await mockSharedApis(page, []);

  await page.goto("/messages");

  await expect(page.getByText("No messages match the current filters.")).toBeVisible();
});

test("mock mode test message appears in the message list", async ({ page }) => {
  const messages: MockMessage[] = [];

  await page.setExtraHTTPHeaders(AUTH_BYPASS_HEADER);
  await mockSharedApis(page, messages);
  await page.route("**/api/webhooks/whatsapp", async (route) => {
    const payload = await route.request().postDataJSON();
    const inboundText = payload.entry[0].changes[0].value.messages[0].text.body;

    messages.unshift({
      id: "message-1",
      createdAt: new Date().toISOString(),
      direction: "INBOUND",
      fromNumber: "15555550100",
      toNumber: "15555550199",
      bodyText: inboundText,
      status: "REPLIED",
      aiReplyText: "Mock reply generated",
      connection: { id: "connection-1", displayName: "Support", phoneNumberId: "1234567890" },
    });

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          processed: [{ waMessageId: "mock-message-1", status: "REPLIED", aiReplyText: "Mock reply generated" }],
        },
      }),
    });
  });

  await page.goto("/whatsapp");
  await page.getByLabel("Message text").fill("Do you deliver today?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Mock reply generated")).toBeVisible();

  await page.goto("/messages");
  await expect(page.getByText("Do you deliver today?")).toBeVisible();
});

test("pagination works", async ({ page }) => {
  const messages = Array.from({ length: 25 }, (_, index): MockMessage => ({
    id: `message-${index + 1}`,
    createdAt: new Date().toISOString(),
    direction: "INBOUND",
    fromNumber: "15555550100",
    toNumber: "15555550199",
    bodyText: `Message ${index + 1}`,
    status: "REPLIED",
    aiReplyText: `Reply ${index + 1}`,
    connection: { id: "connection-1", displayName: "Support", phoneNumberId: "1234567890" },
  }));

  await page.setExtraHTTPHeaders(AUTH_BYPASS_HEADER);
  await mockSharedApis(page, messages);

  await page.goto("/messages");
  await expect(page.getByText("Page 1 of 2")).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Page 2 of 2")).toBeVisible();
  await expect(page.getByText("Message 21")).toBeVisible();
});
