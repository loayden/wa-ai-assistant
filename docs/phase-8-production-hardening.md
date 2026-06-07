# Phase 8: Onboarding, Security, Observability, And Production Release

## Status

Phase 8 has started. This pass focuses on safe local work only: audit logs, public env audit, Phase 8 public route aliases, production checklist, and local verification. Production-impacting actions remain blocked until explicit approval.

## Implemented

- Added `audit_logs` Prisma model and additive migration.
- Enabled RLS for `audit_logs` in migration SQL.
- Added best-effort `writeAuditLog()` helper with recursive secret redaction.
- Added audit writes for:
  - Settings updates.
  - WhatsApp connect/update.
  - WhatsApp delete.
  - Paymob checkout creation.
  - Onboarding completion.
- Added `auditPublicEnvironment()` to catch unsafe `NEXT_PUBLIC_` variables.
- Added Phase 8 canonical public routes:
  - `/features/whatsapp`
  - `/features/instagram`
  - `/features/ai`
  - `/features/inbox`
  - `/compare/respond-io`
  - `/compare/whatschimp`
- Added `docs/production-checklist.md`.
- Added tests for audit log redaction/write payload, public env audit, audit-log RLS migration, and Paymob invalid HMAC rejection.

## Still External

- Apply the audit logs migration to production Supabase after backup and approval.
- Verify production RLS in Supabase SQL editor.
- Verify live Meta, Paymob, OpenAI, OAuth, email template, and webhook settings.
- Run live-channel delivery tests for WhatsApp, Messenger, and Instagram.

## Notes

Audit logging is intentionally best-effort. If the migration has not been applied yet, the helper logs a warning and does not block the user action.

## Local Verification

Completed on 2026-06-06:

- `npx prisma generate`
- `npx tsc --noEmit`
- `npm test` - 36 files, 156 tests passed.
- `npm run lint`
- `npm run build`
- `git diff --check`
- Production-build smoke on mobile `390x844` and desktop `1440x1000`:
  - `/features/whatsapp`
  - `/features/instagram`
  - `/features/ai`
  - `/features/inbox`
  - `/compare/respond-io`
  - `/compare/whatschimp`
  - `/pricing`
  - `/security`

Smoke result: no `5xx`, no console errors, and no horizontal overflow.
