// FILE: tests/e2e/dashboard.spec.ts
/*
 * [ROLE: QA ENGINEER]
 * Decision: Dashboard E2E tests verify middleware redirect behavior and the
 * authenticated dashboard surface with a real session plus mocked tenant data.
 */
import { expect, test, type Page } from "@playwright/test";

import { login } from "./helpers/auth";

async function mockDashboardApis(page: Page) {
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
            monthlyReplyCount: 12,
            replyCountResetAt: new Date().toISOString(),
            stripeCustomerId: null,
            stripeSubscriptionId: null,
          },
        },
      }),
    });
  });
  await page.route("**/api/messages**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: [
          {
            id: "message-1",
            createdAt: new Date().toISOString(),
            direction: "INBOUND",
            fromNumber: "15555550100",
            toNumber: "15555550199",
            bodyText: "Hello",
            status: "REPLIED",
            aiReplyText: "Hi there",
            connection: { id: "connection-1", displayName: "Support", phoneNumberId: "1234567890" },
          },
        ],
        meta: { total: 1, page: 1, limit: 100 },
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
}

test("unauthenticated users are redirected to login", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
});

test("authenticated user can reach dashboard and see the command center", async ({ page }) => {
  await mockDashboardApis(page);
  await login(page);

  await expect(page.getByText("Your AI assistant")).toBeVisible();
  await expect(page.getByRole("button", { name: "Pause AI replies" })).toBeVisible();
  await expect(page.getByText("Recent conversations")).toBeVisible();
  await expect(page.getByRole("button", { name: "Customize assistant" })).toBeVisible();
});
