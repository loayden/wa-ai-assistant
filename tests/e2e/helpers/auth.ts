// FILE: tests/e2e/helpers/auth.ts
/*
 * [ROLE: QA ENGINEER]
 * Decision: E2E tests share one real Supabase-backed login helper so protected
 * routes are exercised through the same session flow as production.
 */
import { expect, type Page } from "@playwright/test";

export const TEST_EMAIL = "qa-owner@example.com";
export const TEST_PASSWORD = "Password1A";

export async function login(page: Page) {
  await page.goto("/login");
  await expect(page.locator("#email")).toBeVisible();
  await expect(page.locator("#password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
  await page.locator("#email").fill(TEST_EMAIL);
  await page.locator("#password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
  await expect(page.getByText("Your AI assistant")).toBeVisible();
}
