// FILE: next.config.mjs
import path from "node:path";
import { withSentryConfig } from "@sentry/nextjs";

/*
 * [ROLE: DEVOPS ENGINEER]
 * Decision: This `.mjs` file keeps configuration executable while preserving
 * strict environment validation, image allow-listing, and security headers at
 * the framework boundary.
 */
const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
  "DIRECT_URL",
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "WHATSAPP_APP_ID",
  "WHATSAPP_APP_SECRET",
  "WHATSAPP_VERIFY_TOKEN",
  "WHATSAPP_API_VERSION",
  "WHATSAPP_MOCK_MODE",
  "PAYMOB_SECRET_KEY",
  "PAYMOB_PUBLIC_KEY",
  "PAYMOB_HMAC_SECRET",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "NEXT_PUBLIC_APP_URL",
  "NODE_ENV",
  "ENCRYPTION_SECRET",
];

const VALID_NODE_ENV_VALUES = new Set(["development", "test", "production"]);
const VALID_BOOLEAN_STRING_VALUES = new Set(["true", "false"]);

function isUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" || url.protocol === "postgresql:";
  } catch {
    return false;
  }
}

function assertValidUrl(name, value) {
  if (!isUrl(value)) {
    throw new Error(`Invalid environment variable ${name}: expected a valid URL.`);
  }
}

function validateEnv(env = process.env) {
  const missing = REQUIRED_ENV_VARS.filter((name) => !env[name] || env[name]?.trim() === "");

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  assertValidUrl("NEXT_PUBLIC_SUPABASE_URL", env.NEXT_PUBLIC_SUPABASE_URL);
  assertValidUrl("DATABASE_URL", env.DATABASE_URL);
  assertValidUrl("DIRECT_URL", env.DIRECT_URL);
  assertValidUrl("NEXT_PUBLIC_APP_URL", env.NEXT_PUBLIC_APP_URL);

  if (env.AUTH_EMAIL_REDIRECT_URL) {
    assertValidUrl("AUTH_EMAIL_REDIRECT_URL", env.AUTH_EMAIL_REDIRECT_URL);
  }

  if (!VALID_NODE_ENV_VALUES.has(env.NODE_ENV)) {
    throw new Error("Invalid environment variable NODE_ENV: expected development, test, or production.");
  }

  if (!VALID_BOOLEAN_STRING_VALUES.has(env.WHATSAPP_MOCK_MODE)) {
    throw new Error('Invalid environment variable WHATSAPP_MOCK_MODE: expected "true" or "false".');
  }

  if (!/^v\d+\.\d+$/.test(env.WHATSAPP_API_VERSION)) {
    throw new Error('Invalid environment variable WHATSAPP_API_VERSION: expected format like "v19.0".');
  }

  if (env.ENCRYPTION_SECRET.length !== 32) {
    throw new Error("Invalid environment variable ENCRYPTION_SECRET: expected exactly 32 characters.");
  }
}

validateEnv();

const securityHeaders = [
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(self)",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig = {
  outputFileTracingRoot: path.resolve(process.cwd()),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lookaside.fbsbx.com",
      },
      {
        protocol: "https",
        hostname: "scontent.xx.fbcdn.net",
      },
      {
        protocol: "https",
        hostname: "*.cdn.whatsapp.net",
      },
      {
        protocol: "https",
        hostname: "images.pexels.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
