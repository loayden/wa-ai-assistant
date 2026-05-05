// FILE: tests/e2e/auth.spec.ts
/*
 * [ROLE: QA ENGINEER]
 * Decision: Auth E2E tests mock network boundaries so form behavior, redirects,
 * and logout controls can run without a live Supabase project.
 */
import { expect, test, type Page } from "@playwright/test";

const AUTH_BYPASS_HEADER = { "x-e2e-auth-bypass": process.env.E2E_AUTH_BYPASS_SECRET ?? "playwright-secret" };

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
            monthlyReplyCount: 0,
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
      body: JSON.stringify({ success: true, data: [], meta: { total: 0, page: 1, limit: 100 } }),
    });
  });
  await page.route("**/api/whatsapp/connect", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { connections: [] } }),
    });
  });
}

test("signup flow shows email verification notice", async ({ page }) => {
  await page.route("**/api/auth/signup", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          user: { id: "user-1", email: "owner@example.com" },
          requiresEmailVerification: true,
        },
      }),
    });
  });

  await page.goto("/signup");
  await page.getByLabel("Full name").fill("Owner Name");
  await page.getByLabel("Email").fill("owner@example.com");
  await page.getByLabel("Password", { exact: true }).fill("Password1");
  await page.getByLabel("Confirm password").fill("Password1");
  await page.getByLabel("I accept the terms and privacy policy").check();
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByText("Check your email")).toBeVisible();
});

test("login with valid credentials redirects to dashboard", async ({ page }) => {
  await page.setExtraHTTPHeaders(AUTH_BYPASS_HEADER);
  await mockDashboardApis(page);
  await page.route("**/api/auth/login", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          user: {
            id: "user-1",
            email: "owner@example.com",
            planTier: "FREE",
            subscriptionStatus: "INACTIVE",
          },
        },
      }),
    });
  });

  await page.goto("/login");
  await page.getByLabel("Email").fill("owner@example.com");
  await page.getByLabel("Password").fill("Password1");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

test("login with invalid credentials shows an error", async ({ page }) => {
  await page.route("**/api/auth/login", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ success: false, error: "Invalid login credentials." }),
    });
  });

  await page.goto("/login");
  await page.getByLabel("Email").fill("owner@example.com");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page.getByText("Invalid login credentials.")).toBeVisible();
});

test("logout returns the user to login", async ({ page }) => {
  await page.setExtraHTTPHeaders(AUTH_BYPASS_HEADER);
  await mockDashboardApis(page);
  await page.route("**/api/auth/logout", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { signedOut: true } }),
    });
  });

  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Logout" }).click();

  await expect(page).toHaveURL(/\/login/);
});
