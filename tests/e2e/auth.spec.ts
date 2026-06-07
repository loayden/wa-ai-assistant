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
  await page.locator("#fullName").fill("Owner Name");
  await page.locator("#signupEmail").fill("owner@example.com");
  await page.locator("#signupPassword").fill("Password1");
  await page.locator("#confirmPassword").fill("Password1");
  await page.locator("input[name='acceptTerms']").check();
  await expect(page.getByRole("button", { name: "إنشاء الحساب" })).toBeEnabled();
  await page.getByRole("button", { name: "إنشاء الحساب" }).click();

  await expect(page.getByText("راجعي بريدك الإلكتروني")).toBeVisible();
});

test("login with valid credentials redirects to dashboard", async ({ page }) => {
  await login(page);

  await expect(page.getByText("مركز التحكم")).toBeVisible();
});

test("login with invalid credentials shows an error", async ({ page }) => {
  await page.goto("/login");
  await page.locator("#email").fill(TEST_EMAIL);
  await page.locator("#password").fill("wrong-password");
  await page.getByRole("button", { name: "تسجيل الدخول" }).click();

  await expect(page.getByText("البريد الإلكتروني أو كلمة المرور غير صحيحة.", { exact: false })).toBeVisible();
});

test("logout returns the user to login", async ({ page }) => {
  await login(page);
  await expect(page.getByText("مركز التحكم")).toBeVisible();
  await page.getByRole("button", { name: "فتح الحساب" }).click();
  await page.getByRole("button", { name: "تسجيل الخروج" }).click();

  await expect(page).toHaveURL(/\/login/);
});
