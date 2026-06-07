# Phase 7: Security, Observability, QA, And Production Release

## Executive Summary

Phase 7 turns the previous product work into a safer production candidate. The code now has stronger protections for scheduled jobs, webhook traffic, AI reply generation, manual replies, and direct WhatsApp sends. It also locks secret redaction in structured logs with tests.

This phase does not apply production database migrations, rotate secrets, change Vercel environment variables, submit Meta App Review, or run live Paymob/OpenAI transactions. Those are production-impacting actions and must be completed manually with explicit approval.

## What Changed

- Centralized cron authorization in `src/lib/security/cron.ts`.
- Added timing-safe Bearer secret comparison for cron routes.
- Kept local/test cron behavior usable without a secret, but production cron now requires `CRON_SECRET`.
- Added per-user rate limits for:
  - Manual AI reply testing.
  - Manual conversation replies.
  - Direct WhatsApp sends.
- Added per-source rate limits for:
  - Meta social webhooks.
  - WhatsApp webhooks.
  - Paymob webhooks.
- Added request-scoped rate-limit keys using forwarded IP headers.
- Added unit tests for cron authorization boundaries.
- Added unit tests proving production logs redact nested tokens, secrets, authorization headers, and client secrets.
- Extended rate-limit tests for request-scoped webhook keys.

## Root Cause Coverage

Historical issue: production jobs and message send paths were relying on scattered authorization/rate-limit logic.

Fix: shared cron authorization plus route-level rate limits reduce the chance of drift, accidental insecure cron exposure, message-send abuse, or uncontrolled webhook traffic.

Historical issue: integration failures can accidentally include provider metadata.

Fix: structured logger already redacts sensitive keys; Phase 7 adds a regression test so access tokens, client secrets, authorization values, signatures, HMACs, API keys, cookies, raw bodies, and payloads do not leak through metadata.

## Security Review

Implemented:

- Tenant-owned API paths still authenticate through `requireAppUser`.
- Cron routes now share one security helper.
- Webhook POST routes keep signature/HMAC verification and now have rate limits.
- Message send paths now have user-scoped abuse protection.
- Logs redact sensitive metadata recursively.
- CSP remains strict and explicit through the existing security policy module.

Still external/manual:

- Confirm `CRON_SECRET` exists in Vercel Production before enabling Vercel cron.
- Confirm all Vercel secrets are production values, not test credentials.
- Confirm Meta App Review approval for public Messenger and Instagram DM usage.
- Confirm a production WhatsApp Business number is connected.
- Confirm OpenAI billing/quota is active.
- Confirm live Paymob keys and a controlled live payment test.

## Observability Review

Implemented:

- Integration failures continue to use structured logger contexts such as:
  - `api.webhooks.whatsapp`
  - `api.webhooks.meta`
  - `api.webhooks.paymob`
  - `api.conversations.reply`
  - `api.ai.reply`
  - `api.cron.process-outbox`
- Rate-limit violations are logged with context, limit, and retry window.
- Sensitive metadata is redacted before writing production JSON logs.

Recommended next:

- Add persisted readiness snapshots after Supabase migration approval.
- Add dashboard alerts for repeated webhook signature failures, OpenAI quota failures, and Meta token expiry.
- Add uptime checks for `/api/health`, webhook GET verification endpoints, and readiness API.

## QA Checklist

Code-level checks completed locally on 2026-06-06:

- `npx tsc --noEmit`
- `npm test` - 32 files, 148 tests passed.
- `npm run lint`
- `npm run build`
- `git diff --check`
- Targeted production-build browser smoke on:
  - `/`
  - `/pricing`
  - `/security`
  - `/compare/respondio`
  - `/whatsapp-ai`
  - `/readiness` unauthenticated redirect to `/login?next=%2Freadiness`

Browser smoke covered mobile `390x844` and desktop `1440x1000`, with no `5xx`, console errors, or horizontal overflow.

Manual production checks required before public launch:

- First-time signup in a clean browser.
- Wrong password and reset-password flow.
- WhatsApp production connection with a real customer number.
- Messenger connection with an approved production Page.
- Instagram connection with an approved linked Professional account.
- Auto-reply delivery on WhatsApp, Messenger, and Instagram.
- Manual reply delivery on WhatsApp, Messenger, and Instagram.
- Support ticket creation.
- Live Paymob checkout in a controlled account.
- Supabase auth email branding and production redirect URLs.
- Google OAuth consent screen branding and authorized domains.

## Release Checklist

Vercel:

- Set production `CRON_SECRET`.
- Verify OpenAI, Paymob, Meta, Supabase, Resend, and encryption secrets.
- Confirm `NEXT_PUBLIC_APP_URL=https://kallem.vercel.app`.
- Confirm no development/test keys are used for production checkout.

Supabase:

- Back up production database.
- Apply pending migrations only after approval.
- Verify RLS policies and service role usage.
- Review auth email templates and redirect URLs.

Meta:

- Verify Page webhook subscriptions after connecting the production Page.
- Verify Instagram account is linked to the selected Facebook Page.
- Verify Messenger and Instagram permissions are approved for public users.
- Verify WhatsApp phone number is production, not a test number.

Paymob:

- Confirm live public key, secret key, HMAC secret, and card integration ID.
- Run one controlled live transaction.
- Confirm webhook signature validation receives successful callbacks.

OpenAI:

- Confirm billing/quota is active.
- Confirm `OPENAI_MODEL` is supported and cost-appropriate.
- Monitor quota and timeout errors after launch.

## Current Status

Phase 7 code hardening is implemented locally. Public launch is still blocked until the external production checklist above is completed.
