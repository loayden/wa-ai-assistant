// FILE: playwright.config.ts
/*
 * [ROLE: QA ENGINEER]
 * Decision: Playwright starts the same Next app used in development while
 * passing deterministic mock credentials for E2E-only API interception.
 */
import { defineConfig, devices } from "@playwright/test";

const env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "test-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "test-service-role-key",
  DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://user:pass@localhost:5432/db",
  DIRECT_URL: process.env.DIRECT_URL ?? "postgresql://user:pass@localhost:5432/db",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "test-openai-key",
  OPENAI_MODEL: process.env.OPENAI_MODEL ?? "gpt-4o",
  WHATSAPP_APP_ID: process.env.WHATSAPP_APP_ID ?? "test-whatsapp-app",
  WHATSAPP_APP_SECRET: process.env.WHATSAPP_APP_SECRET ?? "test-whatsapp-secret",
  WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN ?? "test-whatsapp-verify",
  WHATSAPP_API_VERSION: process.env.WHATSAPP_API_VERSION ?? "v19.0",
  WHATSAPP_MOCK_MODE: process.env.WHATSAPP_MOCK_MODE ?? "true",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? "sk_test_dummy",
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY ?? "pk_test_dummy",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "pk_test_dummy",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_dummy",
  STRIPE_PRO_PRICE_ID: process.env.STRIPE_PRO_PRICE_ID ?? "price_dummy",
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? "re_dummy",
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL ?? "noreply@example.com",
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000",
  NODE_ENV: "test",
  ENCRYPTION_SECRET: process.env.ENCRYPTION_SECRET ?? "12345678901234567890123456789012",
  E2E_AUTH_BYPASS_SECRET: process.env.E2E_AUTH_BYPASS_SECRET ?? "playwright-secret",
};

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: 'PATH="/Users/shereenmagdy/Desktop/whats app/.codex-bin:$PATH" pnpm dev --hostname 127.0.0.1 --port 3000',
    env,
    reuseExistingServer: true,
    timeout: 120_000,
    url: "http://127.0.0.1:3000",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
