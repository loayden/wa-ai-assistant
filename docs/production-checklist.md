# Kallem Production Checklist

Use this checklist before opening Kallem to public customers. Do not mark production ready until every external service is verified with live production configuration.

## Code Verification

- Run `npx tsc --noEmit`.
- Run `npm test`.
- Run `npm run lint`.
- Run `npm run build`.
- Run `git diff --check`.
- Smoke test public pages on mobile and desktop.
- Smoke test protected route redirects to `/login?next=<path>`.

## Environment And Secrets

- Confirm only reviewed browser-safe variables use `NEXT_PUBLIC_`.
- Do not expose service-role keys, access tokens, HMAC secrets, API secrets, database URLs, or private keys in `NEXT_PUBLIC_`.
- Confirm `ENCRYPTION_SECRET` is 32 characters and stable across deployments.
- Confirm `CRON_SECRET` exists in Vercel Production.
- Confirm `NEXT_PUBLIC_APP_URL=https://kallem.vercel.app`.

Allowed public env keys:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_META_APP_ID`
- `NEXT_PUBLIC_SENTRY_DSN`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`

## Supabase

- Back up production database before migrations.
- Apply pending additive migrations only after approval.
- Confirm RLS is enabled for tenant-owned tables.
- Confirm `audit_logs` has owner-only read policy after migration.
- Confirm Supabase Auth email templates use Kallem branding and production URLs.
- Confirm password reset and magic link redirect to production.
- Before public launch, buy a real domain, verify it in Resend, set `RESEND_FROM_EMAIL` to a real sender such as `no-reply@yourdomain.com`, then enable Supabase custom SMTP with Resend. Do not enable SMTP with `noreply@example.com`.

## Meta

- Confirm production Meta app has the exact OAuth redirect URLs.
- Confirm Messenger permissions are approved for public users.
- Confirm Instagram DM permissions are approved for public users.
- Current blocker from 2026-06-07 review: Meta App Review is still a draft because `Kallem Business` is unverified and `instagram_manage_messages` / `instagram_basic` allowed-usage forms need real screencasts. See `docs/meta-app-review-action-plan.md`.
- Confirm selected Facebook Page is subscribed to webhook fields.
- Confirm Instagram Professional account is linked to the selected Facebook Page.
- Confirm WhatsApp Business phone number is production, not a test number.
- Send real test messages through WhatsApp, Messenger, and Instagram.

## Paymob

- Confirm live `PAYMOB_PUBLIC_KEY`, `PAYMOB_SECRET_KEY`, `PAYMOB_HMAC_SECRET`, and `PAYMOB_CARD_INTEGRATION_ID`.
- Confirm checkout is disabled when Paymob mode is test or missing.
- Run one controlled live payment.
- Confirm Paymob webhook signature validation accepts the live callback.
- Confirm subscription event and audit log are written.

## OpenAI

- Confirm `OPENAI_API_KEY` is valid and funded.
- Confirm `OPENAI_MODEL` is available and cost appropriate.
- Test AI unavailable states for quota, timeout, and auth failure.
- Monitor OpenAI errors after launch.

## User Flow Smoke

- New signup.
- Login.
- Wrong password.
- Password reset.
- Add business info.
- Add product.
- Add three knowledge questions.
- Test AI answer with sources.
- View readiness score.
- Connect WhatsApp.
- Connect Messenger.
- Connect Instagram.
- Receive inbound message.
- Auto-reply delivered.
- Manual reply delivered.
- Human handoff and resume.
- Support ticket creation.
- Billing checkout.

## Observability

- Confirm Sentry/browser error monitoring is active if `NEXT_PUBLIC_SENTRY_DSN` is set.
- Confirm structured logs are available for webhook, payment, channel, AI, cron, and reply failures.
- Confirm audit logs are written for settings updates, channel connect/delete, onboarding completion, and checkout creation.
- Confirm rate-limit violations are logged without secrets.

## Launch Decision

Kallem can open to public customers only when:

- All code checks pass.
- All production credentials are live.
- Meta approval and production WhatsApp number are complete.
- OpenAI billing is active.
- Paymob live payment succeeds.
- Supabase migrations and RLS are verified.
- A clean-browser end-to-end smoke test passes.
