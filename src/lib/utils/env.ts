// FILE: src/lib/utils/env.ts
/*
 * [ROLE: DEVOPS ENGINEER]
 * Decision: Runtime code needs the same strict environment contract as the
 * framework config, and marking it server-only prevents accidental bundling of
 * server secrets into client components.
 */
import "server-only";

import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().min(1).default("gpt-4o"),
  WHATSAPP_APP_ID: z.string().min(1),
  WHATSAPP_APP_SECRET: z.string().min(1),
  WHATSAPP_VERIFY_TOKEN: z.string().min(1),
  WHATSAPP_API_VERSION: z.string().regex(/^v\d+\.\d+$/),
  WHATSAPP_MOCK_MODE: z.enum(["true", "false"]).transform((value) => value === "true"),
  PAYMOB_API_KEY: z.string().optional(),
  PAYMOB_SECRET_KEY: z.string().min(1),
  PAYMOB_PUBLIC_KEY: z.string().min(1),
  PAYMOB_HMAC_SECRET: z.string().min(1),
  PAYMOB_CARD_INTEGRATION_ID: z.string().optional(),
  PAYMOB_CURRENCY: z.string().min(3).max(3).default("EGP"),
  PAYMOB_PRO_AMOUNT_CENTS: z.coerce.number().int().positive().default(99900),
  PAYMOB_BUSINESS_AMOUNT_CENTS: z.coerce.number().int().positive().default(249900),
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.string().email(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  AUTH_EMAIL_REDIRECT_URL: z.string().url().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]),
  ENCRYPTION_SECRET: z.string().length(32),
});

export type AppEnv = z.infer<typeof envSchema>;

export function validateEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsed = envSchema.safeParse(env);

  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  return parsed.data;
}

export const appEnv = validateEnv();
