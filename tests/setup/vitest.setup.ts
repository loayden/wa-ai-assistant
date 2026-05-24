// FILE: tests/setup/vitest.setup.ts
/*
 * [ROLE: QA ENGINEER]
 * Decision: Unit tests use deterministic dummy service configuration because
 * client libraries validate environment variables at module import time.
 */
import { afterEach, vi } from "vitest";

Object.assign(process.env, {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  DIRECT_URL: "postgresql://user:pass@localhost:5432/db",
  OPENAI_API_KEY: "test-openai-key",
  OPENAI_MODEL: "gpt-4o-mini",
  WHATSAPP_APP_ID: "test-whatsapp-app",
  WHATSAPP_APP_SECRET: "test-whatsapp-secret",
  WHATSAPP_VERIFY_TOKEN: "test-whatsapp-verify",
  WHATSAPP_API_VERSION: "v19.0",
  WHATSAPP_MOCK_MODE: "true",
  STRIPE_SECRET_KEY: "sk_test_dummy",
  STRIPE_PUBLISHABLE_KEY: "pk_test_dummy",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_dummy",
  STRIPE_WEBHOOK_SECRET: "whsec_dummy",
  STRIPE_PRO_PRICE_ID: "price_dummy",
  STRIPE_BUSINESS_PRICE_ID: "price_business_dummy",
  PAYMOB_SECRET_KEY: "test-paymob-secret-key",
  PAYMOB_PUBLIC_KEY: "test-paymob-public-key",
  PAYMOB_HMAC_SECRET: "test-paymob-hmac-secret",
  PAYMOB_CARD_INTEGRATION_ID: "123456",
  PAYMOB_IFRAME_ID: "987654",
  PAYMOB_CURRENCY: "EGP",
  PAYMOB_PRO_AMOUNT_CENTS: "99900",
  PAYMOB_BUSINESS_AMOUNT_CENTS: "249900",
  RESEND_API_KEY: "re_dummy",
  RESEND_FROM_EMAIL: "noreply@example.com",
  ADMIN_EMAIL: "admin@example.com",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NODE_ENV: "test",
  ENCRYPTION_SECRET: "12345678901234567890123456789012",
});

afterEach(() => {
  vi.clearAllMocks();
});
