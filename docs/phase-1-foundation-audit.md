# Phase 1 Foundation Audit

Date: 2026-06-06

Scope: Phase 1 from `docs/kallem-master-prompt-v3.md`: historical regression checklist, database audit, auth protection, CSP, hydration risk, and quality gates.

## Executive Summary

Phase 1 has started. The highest-risk immediate issue was protected route coverage: newly added dashboard pages such as `/readiness` and `/inbox` were not listed in middleware protection, which could render a dashboard shell before auth resolution. This is now fixed at middleware level and in the dashboard layout as a second guard.

No production database changes were applied. The schema audit found several required reliability tables missing or only partially represented by older models. Those migrations are production-impacting and should be handled with an additive migration plan and explicit approval before applying.

## Auth And Route Protection

Current protected dashboard prefixes now include:

- `/dashboard`
- `/inbox`
- `/messages`
- `/settings`
- `/billing`
- `/whatsapp`
- `/knowledge`
- `/templates`
- `/broadcasts`
- `/products`
- `/orders`
- `/corrections`
- `/leads`
- `/analytics`
- `/readiness`
- `/connect`
- `/support`
- `/admin`

Changes made:

- `src/middleware.ts` now protects `/readiness` and `/inbox`.
- `src/app/(dashboard)/layout.tsx` now redirects unauthenticated users to `/login?next=<path>` instead of rendering the shell with no user.
- `tests/unit/middleware-security.test.ts` now verifies redirects for `/dashboard`, `/readiness`, `/inbox`, `/connect`, and `/admin`.

Residual risk:

- Routes outside the dashboard group that still require auth should be reviewed separately. `/setup` is currently public by middleware and needs product decision: public onboarding entry or authenticated setup step.

## CSP Audit

Current CSP source lives in:

- `src/lib/security/csp.ts`

Changes made:

- Added `https://www.googletagmanager.com` to `script-src`.
- Added `https://www.google-analytics.com` and `https://www.googletagmanager.com` to `connect-src`.

Justification:

- Historical production console evidence showed a blocked Google Analytics measurement request.
- Google Tag Manager is the expected script loader for analytics if tracking is enabled.
- The allowlist remains explicit. No broad Google wildcard was added.

Existing explicit production services:

- Supabase.
- OpenAI.
- Anthropic.
- Meta/Facebook.
- Google OAuth APIs.
- Paymob.
- Resend.
- Sentry ingest.
- Vercel Live.
- Pusher.

Security posture:

- No `script-src 'unsafe-inline'`.
- No `script-src-elem` fallback weakening.
- `style-src 'unsafe-inline'` remains because current UI/SDK styling requires inline style tags.
- `frame-ancestors 'none'` and `X-Frame-Options: DENY` remain.

## Database Audit

Source reviewed:

- `prisma/schema.prisma`
- `prisma/migrations/*`

Existing models that cover part of the required domain:

- `User`
- `WhatsAppConnection`
- `Message`
- `Product`
- `Order`
- `AiCorrection`
- `RoutingRule`
- `Lead`
- `ConversationHandoff`
- `UserSettings`
- `SubscriptionEvent`
- `MessageTemplate`
- `Broadcast`
- `SupportTicket`
- `CustomerProfile`
- `InstagramCommentLead`
- `InstagramPostStats`
- `WhatsAppFlow`
- `FlowResponse`
- `Appointment`

Required Phase v3 data structures and current status:

| Required structure | Current status | Notes |
|---|---:|---|
| `conversations` | missing | Existing app derives threads from `messages` + `conversation_handoffs`. A real conversation table is needed for reliable inbox/outbox/analytics. |
| `messages` | partial | Existing table has tenant scoping and channel fields, but no `conversationId` and no normalized `failureReason`. |
| `ai_reply_traces` | missing | Needed for AI source/confidence/debug trace. |
| `outbox_messages` | missing | Needed for auto/manual send reliability, retry, and delivery diagnostics. |
| `webhook_events` | missing | Needed for idempotency and replay/debug of Meta/Paymob events. |
| `integration_connections` | missing | Existing `whatsapp_connections` stores multi-channel state; a normalized table would reduce ambiguity. |
| `automation_rules` | partial | Existing `RoutingRule` covers topic routing, not full guided automation recipes. |
| `automation_runs` | missing | Needed for auditability of automation execution. |
| `readiness_snapshots` | missing | Current readiness is computed live; history is not persisted. |
| `audit_logs` | missing | Needed for security-critical actions and production diagnostics. |

Recommended migration approach:

1. Prepare additive migrations only.
2. Do not drop or rename existing columns.
3. Add new tables behind feature flags or unused code paths first.
4. Backfill conversation IDs from existing messages in a separate, reversible script.
5. Deploy schema before routing production logic to new tables.
6. Validate indexes and query plans before enabling inbox/outbox features.

Production risk:

- Adding tables is low-to-medium risk.
- Backfilling and switching message flows to `conversations`/`outbox_messages` is medium-to-high risk.
- Applying migrations requires explicit approval, database backup confirmation, and rollback plan.

No production migration was applied in this Phase 1 start.

## Hydration Audit

Search patterns reviewed:

- `new Date(`
- `Date.now(`
- `Math.random(`
- `Intl.DateTimeFormat`
- `toLocaleString`
- `window`
- `navigator`

Findings:

- Many client components format timestamps in render. This can be safe when values are deterministic, but it can still mismatch between server-rendered HTML and browser hydration if timezone/locale output differs.
- Root layout currently uses `suppressHydrationWarning`, which reduces visible root-level noise but should not be used as a substitute for deterministic component output.
- Higher-risk surfaces:
  - `src/components/dashboard/DashboardPageClient.tsx`
  - `src/components/readiness/ReadinessPageClient.tsx`
  - `src/components/messages/MessageList.tsx`
  - `src/components/messages/MessageItem.tsx`
  - `src/components/analytics/AnalyticsPageClient.tsx`
  - `src/components/orders/OrdersPageClient.tsx`
  - admin pages that render `new Date()` directly.

Recommended Phase 1 follow-up:

- Introduce a small date formatting helper that accepts ISO strings and formats after mount for relative/current-time text.
- Keep server-rendered fallback text stable.
- Avoid `new Date()` and locale formatting directly inside SSR-rendered client component output for "today", "now", and relative time.

Current status:

- Audit completed.
- Full hydration cleanup not completed in this first Phase 1 slice because it touches many UI surfaces and needs visual regression testing.

## Quality Gate Results So Far

Executed:

```bash
npm test -- tests/unit/middleware-security.test.ts
```

Result:

- Passed: 6 tests.
- Note: Supabase emitted non-fatal duplicate GoTrueClient warnings in the test environment. The assertions passed and no network dependency was introduced.

Still required before Phase 1 can be marked complete:

- TypeScript full check.
- ESLint.
- Full test suite or relevant expanded suite.
- Production build.
- Browser redirect check for `/readiness` and `/inbox`.
- Hydration follow-up or explicit deferral to a scoped UI stability task.
