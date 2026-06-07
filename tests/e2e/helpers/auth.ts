// FILE: tests/e2e/helpers/auth.ts
/*
 * [ROLE: QA ENGINEER]
 * Decision: E2E tests share one real Supabase-backed login helper so protected
 * routes are exercised through the same session flow as production.
 */
import { expect, type Page } from "@playwright/test";

export const TEST_EMAIL = "qa-owner@example.com";
export const TEST_PASSWORD = "Password1A";

async function mockReadinessApi(page: Page) {
  await page.route("**/api/readiness/check**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          score: 92,
          passed: 9,
          warnings: 1,
          failed: 0,
          total: 10,
          mode: "light",
          generatedAt: new Date().toISOString(),
          checks: [],
        },
      }),
    });
  });
}

export async function login(page: Page, destination: "/dashboard" | "/whatsapp" | "/messages" | null = "/dashboard") {
  await mockReadinessApi(page);
  await page.goto(destination ? `/login?next=${encodeURIComponent(destination)}` : "/login");
  await expect(page.locator("#email")).toBeVisible();
  await expect(page.locator("#password")).toBeVisible();
  await expect(page.getByRole("button", { name: "تسجيل الدخول" })).toBeEnabled();
  await page.locator("#email").fill(TEST_EMAIL);
  await page.locator("#password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "تسجيل الدخول" }).click();
  await expect(page).toHaveURL(/\/(connect|dashboard|whatsapp|messages)/, { timeout: 45_000 });

  if (destination === "/dashboard") {
    await expect(page.getByText("مركز التحكم")).toBeVisible();
  }
}
