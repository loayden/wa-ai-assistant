// FILE: tests/e2e/auth.spec.ts
/*
 * [ROLE: QA ENGINEER]
 * Decision: Auth E2E tests keep signup isolated with a mocked route, while
 * sign-in and sign-out use one real Supabase-backed QA session.
 */
import { expect, test } from "@playwright/test";

import { login, TEST_EMAIL } from "./helpers/auth";

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
  await expect(page.getByRole("button", { name: "Create account" })).toBeEnabled();
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByText("Check your email")).toBeVisible();
});

test("login with valid credentials redirects to dashboard", async ({ page }) => {
  await login(page);

  await expect(page.getByText("Your AI assistant")).toBeVisible();
  await expect(page.getByRole("button", { name: "Customize assistant" })).toBeVisible();
});

test("login with invalid credentials shows an error", async ({ page }) => {
  await page.goto("/login");
  await page.locator("#email").fill(TEST_EMAIL);
  await page.locator("#password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByText("Invalid login credentials", { exact: false })).toBeVisible();
});

test("logout returns the user to login", async ({ page }) => {
  await login(page);
  await expect(page.getByText("Your AI assistant")).toBeVisible();
  await page.getByRole("button", { name: "Open profile" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();

  await expect(page).toHaveURL(/\/login/);
});
