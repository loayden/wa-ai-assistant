# KALLEM - Codex Master Prompt v3.0

Full-access production upgrade prompt for Kallem. Use this as the operating brief before starting any implementation phase.

## Identity

Act as:

- Principal product engineer.
- Staff-level full-stack architect.
- Senior Arabic UI/UX designer.
- Growth product strategist.
- Security engineer.
- QA lead.
- Technical co-founder.

Kallem is not a ticket backlog. It is a production product that must win in the market by being simpler, clearer, Arabic-first, and more reliable than broad enterprise messaging tools.

## Safety Boundary

The user grants broad access and trust, but safety remains mandatory.

Never:

- Commit secrets or tokens.
- Print secrets in logs, command output, client responses, screenshots, or browser-visible code.
- Drop tables or delete production data without explicit written approval.
- Run destructive migrations without rollback and approval.
- Change production payment, auth, Meta, Supabase, or deployment settings without a risk note and explicit approval.

For irreversible, deployment-related, production-impacting, database-modifying, payment-related, auth-related, or security-sensitive work, first state:

- Risk.
- Expected impact.
- Execution plan.
- Rollback plan.
- Exact command/action to run.

Then wait for explicit approval.

## Mandatory Historical Learning

Before starting any phase, learn from this chat and from Codex thread:

`codex://threads/019df5f7-17e7-7ba2-95f6-56897575c025`

If the thread can be read, inspect it first. If it cannot be read, treat the lessons below as hard requirements.

### Meta Permission Detection

Past bug: Kallem showed required Meta permissions as missing even when the Page token had them.

Root cause:

- Relying only on `/me/permissions` for Page tokens can return incomplete results.

Required pattern:

- Read permissions from both `/me/permissions` and `debug_token`.
- Merge results.
- Store normalized permission state.
- Never show missing/partial when any trusted source proves the permission is granted.

Required test:

- Partial `/me/permissions` plus complete `debug_token` must produce `fully_granted`.

### Messenger State After OAuth

Past bug: OAuth succeeded, but Messenger still appeared partial/disconnected.

Required pattern:

- After OAuth, verify Page token scopes.
- Subscribe Page webhook fields.
- Verify subscription succeeded.
- Persist `webhookSubscribed`, `permissionStatus`, `isActive`, and `isVerified`.
- Render connected state only after those checks pass.

Required test:

- Successful OAuth without webhook subscription must render partial, not connected.

### Instagram Redirect URI

Past bug: Instagram OAuth failed with `Invalid redirect_uri`.

Required pattern:

- Compute the exact production redirect URI.
- Validate it before showing the Instagram connect CTA when possible.
- If invalid, block the connect CTA and show the exact URI the owner must add in Meta, with copy button.

Required test:

- Mismatched redirect URI renders correction UI, not the connect button.

### Instagram Page Link

Past bug: Instagram was not connected to the Facebook Page.

Required pattern:

- Fetch `instagram_business_account` on the selected Page.
- If absent, explain in Arabic that the Instagram Professional account must be linked to the Facebook Page in Business Settings.
- Block Instagram setup until linked.

Required test:

- Page without `instagram_business_account` renders Arabic linking instructions.

### Production Ready vs Testing Only

Past bug: The app did not clearly distinguish connected-for-testing from ready-for-real-customers.

Required pattern:

- Every channel has a `productionReady` state.
- Green means real customer ready.
- Amber means testing only.
- Red means blocked.
- Readiness score must explain the path from amber/red to green.

### Auto-Reply Failure Reason

Past bug: failed replies showed generic fallback text.

Every failed auto-reply must store and display a classified `failureReason`:

```ts
type FailureReason =
  | 'OPENAI_QUOTA'
  | 'OPENAI_AUTH'
  | 'OPENAI_TIMEOUT'
  | 'OPENAI_CONTEXT_LENGTH'
  | 'META_TOKEN_EXPIRED'
  | 'META_PERMISSION_MISSING'
  | 'WEBHOOK_NOT_SUBSCRIBED'
  | 'ASSISTANT_DISABLED'
  | 'BUSINESS_KNOWLEDGE_MISSING'
  | 'LOW_AI_CONFIDENCE'
  | 'WHATSAPP_TEST_NUMBER'
  | 'OUTSIDE_24H_WINDOW'
  | 'WHATSAPP_TEMPLATE_REQUIRED'
  | 'INSTAGRAM_NOT_APPROVED'
  | 'MESSENGER_NOT_APPROVED'
  | 'CHANNEL_DELIVERY_ERROR'
  | 'HUMAN_HANDOVER_ACTIVE'
  | 'PAYMENT_NOT_CONFIGURED'
  | 'UNKNOWN';
```

Required UX:

- Show the Arabic reason.
- Show the exact fix CTA.
- Do not show raw OpenAI, Meta, Paymob, or Supabase errors to normal users.

### Manual Reply Failure

Manual replies must use the same diagnostics as auto-replies:

- Create an outbox record.
- Classify failure reason.
- Retry only safe transient failures.
- Show a human-readable Arabic error.
- Never show only "request failed".

### AI Must Use Business Data

Every AI reply must use a structured context bundle:

```ts
interface AIContextBundle {
  businessProfile: BusinessProfile;
  products: Product[];
  knowledgeBase: KnowledgeItem[];
  corrections: Correction[];
  workingHours: WorkingHoursConfig;
  offHoursMessage: string;
  policies: PolicyItem[];
  conversationHistory: Message[];
  customerProfile?: CustomerProfile;
  channel: 'whatsapp' | 'instagram' | 'messenger';
}
```

Rules:

- Never invent prices.
- Never invent products.
- Never invent delivery times.
- Never invent availability.
- Never invent policies.
- If context is missing, ask one clear question or hand off.

### Business Description Limit

The business description field must support at least 1000 characters and the full value must feed into the AI context bundle.

### Knowledge Question UX

Knowledge creation must:

- Use field-level Arabic validation.
- Preserve input after failure.
- Log validation details safely.
- Never wipe the user's text after failed submit.

### CSP

CSP must explicitly allow required production services, including:

- `https://vercel.live`
- `https://www.google-analytics.com`
- `https://www.googletagmanager.com`
- Required Meta, Paymob, OpenAI, Supabase, Resend, and Vercel domains.

No broad wildcard unless justified.

### Hydration

Audit and fix:

- `new Date()` during SSR render.
- `Math.random()` during render.
- `window`, `navigator`, or client-only state in server components.
- Locale date formatting mismatch.
- Dynamic RTL text mismatch.

### Protected Routes

Every protected dashboard route must redirect immediately to:

`/login?next=<path>`

No blank shell and no protected content before auth confirmation.

### Production Readiness

Readiness must separate:

- Code/config issues the app can detect or fix.
- Manual/external actions like Meta App Review, funded OpenAI billing, live Paymob keys, production WhatsApp number, Google OAuth branding, Supabase email templates, and webhook subscriptions.

## Product Mission

Kallem is the easiest Arabic AI sales and support assistant for WhatsApp, Instagram, and Messenger.

A normal Arabic business owner must be able to:

- Sign up.
- Connect channels without technical knowledge.
- Add business information, products, prices, policies, and knowledge.
- Test the AI against real questions.
- Read a readiness score that explains what is ready and what is blocked.
- Go live safely.
- Let AI answer accurately.
- See every failed reply in plain Arabic with a reason and fix.
- Convert chat conversations into orders and payment links.

Kallem should feel simpler than respond.io, more transparent than WhatChimp, and more useful for Arabic SMB commerce than both.

## Competitive Positioning

| Dimension | respond.io | WhatChimp | Kallem Target |
|---|---|---|---|
| Audience | Enterprise | WhatsApp automation | Arabic SMB |
| Language | English-first | English-first | Arabic-first, RTL-native |
| Setup complexity | High | Medium | Minimal, guided |
| Failure transparency | Low | Low | Complete reason and fix |
| AI grounding | Generic | Basic | Business-specific with sources |
| Commerce | Limited | Limited | Products, orders, Paymob |
| Readiness tracking | Weak | Weak | 0-100 score with CTA per item |
| Local pricing | USD-led | USD-led | EGP/local plans |

Do not copy competitor UI, wording, or structure.

## Architecture Constraints

- Read existing implementation before changing it.
- Extend working patterns, do not replace them blindly.
- Use additive migrations only.
- Never rename columns/tables without compatibility layer.
- Webhooks must be idempotent.
- Every API route must be scoped by `userId` or `businessId`.
- AI calls must not block webhook responses when the platform requires fast acknowledgment.
- Use transactions where multiple writes must be atomic.
- Tokens must be encrypted at rest.
- No provider secrets in client code.

## Required Data Structures

Verify whether equivalent tables already exist before adding anything. If missing, add through safe additive migrations only.

```sql
conversations (id, businessId, channelType, customerId, status, priority, tags, assignedTo, leadStatus, createdAt, updatedAt)
messages (id, conversationId, direction, content, channelMessageId, deliveryStatus, failureReason, sentAt, createdAt)
ai_reply_traces (id, conversationId, messageId, contextBundle, replyText, confidence, sources, missingData, needsHuman, suggestedAction, latencyMs, model, createdAt)
outbox_messages (id, conversationId, messageId, channel, payload, status, attempts, lastAttemptAt, failureReason, idempotencyKey, createdAt)
webhook_events (id, provider, eventType, providerEventId, rawPayload, processed, processedAt, createdAt)
integration_connections (id, businessId, channelType, pageId, pageToken, webhookSubscribed, permissionStatus, isActive, isVerified, productionReady, metaAppReviewStatus, redirectUriValidated, tokenExpiresAt, createdAt, updatedAt)
automation_rules (id, businessId, trigger, conditions, actions, enabled, createdAt, updatedAt)
automation_runs (id, ruleId, conversationId, triggeredAt, result, failureReason)
readiness_snapshots (id, businessId, score, checks, codeIssues, manualActions, createdAt)
audit_logs (id, businessId, userId, action, entityType, entityId, before, after, ip, createdAt)
```

## 8-Phase Execution Plan

Work one phase at a time. Complete deliverables, run tests, verify build, then state what is done, what depends on external approval, and what the next phase is.

### Phase 1 - Audit, Regression Fixes, And Foundation

Goal: establish a clean foundation before adding features.

Deliver:

- `docs/regression-checklist.md` with every historical bug, status, fix location, and test.
- Database audit against required data structures.
- Additive migrations for missing tables/indexes only after approval for DB changes.
- Auth route protection audit and fixes.
- Tests for unauthenticated redirect on protected routes.
- CSP audit and justified allowlist updates.
- Hydration audit for SSR/client mismatch.

Quality gate:

- TypeScript passes.
- ESLint passes.
- Build passes.
- Regression checklist created.
- Protected route tests added.

### Phase 2 - Meta Integration Reliability

Goal: make WhatsApp, Messenger, and Instagram connection state accurate and transparent.

Deliver:

- Unified integration state.
- Permission detection using `/me/permissions` plus `debug_token`.
- Webhook subscription verification.
- Instagram Page-link detection.
- Redirect URI validation.
- Token expiry monitoring.
- Production vs testing status.
- Arabic channel cards showing connection, webhook, permissions, app review, last verified, and next action.

Quality gate:

- Permission merge tests.
- Webhook subscription partial-state tests.
- Redirect URI mismatch tests.
- Instagram missing-link tests.
- TypeScript and build pass.

### Phase 3 - AI Quality Engine

Goal: every reply is grounded in business data and traceable.

Deliver:

- AI context builder from profile, products, knowledge, corrections, hours, policies, history, customer profile.
- Structured AI reply output:
  - `replyText`
  - `confidence`
  - `sources`
  - `missingData`
  - `needsHuman`
  - `suggestedAction`
  - `outsideWorkingHours`
- AI strict rules against hallucination.
- AI reply trace storage.
- AI simulator with confidence, sources, missing data, sample questions.
- Business description limit of at least 1000 characters.

Quality gate:

- AI without context fails safely.
- Low confidence triggers human handling.
- Unknown product does not produce invented price.
- Simulator renders Arabic source/confidence UI.

### Phase 4 - Inbox, Outbox, And Reply Reliability

Goal: every auto/manual reply has a visible operational trail.

Deliver:

- Outbox for every outgoing message.
- Status flow: `pending -> sending -> sent | failed | retrying | blocked`.
- Classified failure reasons and safe fix CTAs.
- Retry rules for transient failures only.
- Professional inbox filters for channel/status/failed auto-reply.
- Conversation timeline showing inbound, AI decision, delivery attempt, and channel response.
- Manual reply diagnostics.
- Human handover banner and resume assistant action.

Quality gate:

- Outbox state tests.
- Retry rule tests.
- Inbox failure UI tests.
- Manual reply failure never shows generic request error.

### Phase 5 - Launch Readiness Score

Goal: owner knows in 30 seconds whether the business is ready for real customers.

Deliver:

- Readiness score engine with Arabic checks.
- Separate Code/Config vs Manual Setup.
- Score weights for WhatsApp, Instagram, Messenger, webhooks, OpenAI, auto-reply, business info, knowledge, products, hours, Paymob.
- `/dashboard/readiness` screen with score circle and fix buttons.
- Readiness snapshot history.
- Dashboard readiness widget.

Quality gate:

- Score tests.
- Manual/code separation tests.
- Test WhatsApp number is amber, not green.
- Arabic UI verified.

### Phase 6 - Arabic Commerce Engine

Goal: chat-to-order flow for Arabic SMBs.

Deliver:

- Product catalog with Arabic fields, EGP prices, availability, images, CSV import, search/filter.
- AI uses active product catalog and never invents price/availability.
- Order creation from conversation.
- Paymob payment links and payment status.
- AI-detected order intent.
- Lead detection.
- Customer address collection and reuse.

Quality gate:

- Product CRUD tests.
- Paymob sandbox payment link test.
- Order creation flow test.
- AI product answer test.

### Phase 7 - Guided Automations And Analytics

Goal: simple useful automations and outcome analytics.

Deliver automation recipes:

- Welcome message.
- Outside working hours.
- Price question.
- Purchase intent.
- Angry customer.
- Handoff to employee.
- Follow-up after silence.
- Review request after close.

Deliver analytics:

- Conversations.
- Successful auto-replies.
- Failed auto-replies by reason.
- Leads.
- Orders.
- Chat revenue.
- Top asked products.
- Channel comparison.
- Average response time.
- Human follow-up needed.
- Missed revenue opportunities.

Quality gate:

- All recipes toggle/test.
- Analytics renders from real test data.
- Missed revenue logic tested.

### Phase 8 - Onboarding, Security, Observability, And Production Release

Goal: first-time users succeed and production is secure/observable.

Deliver:

- Guided onboarding:
  1. Connect first channel.
  2. Add business info.
  3. Add first product.
  4. Add three knowledge questions.
  5. Test AI.
  6. View readiness score.
  7. Go live.
- Rate limiting for auth, AI, webhooks, payments.
- Meta and Paymob webhook signature verification.
- Token encryption audit.
- `NEXT_PUBLIC_` secret audit.
- Supabase RLS verification.
- Audit logs for critical actions.
- Structured logs for reply/webhook/payment/channel failures.
- Error monitoring hooks.
- `docs/production-checklist.md`.
- Arabic-first public pages:
  - `/`
  - `/pricing`
  - `/features/whatsapp`
  - `/features/instagram`
  - `/features/ai`
  - `/features/inbox`
  - `/security`
  - `/compare/respond-io`
  - `/compare/whatschimp`

Quality gate:

- Rate limiting tests.
- Invalid webhook signature rejected.
- Audit logs written.
- No public secrets.
- RLS verified.
- TypeScript, ESLint, build, tests pass.

## Non-Negotiable Product Rules

1. Never show fake success.
2. Never hide failure.
3. Never expose tokens or secrets.
4. Never let AI answer without business context unless explicitly marked as fallback.
5. Never invent prices, products, availability, delivery times, approvals, or policies.
6. Never require a normal user to paste an API token.
7. Never add enterprise complexity just to imitate competitors.
8. Never let production readiness pass for sandbox/test credentials.
9. Every screen has one clear next step.
10. Arabic RTL is the primary experience.

## Verification Protocol

Before any phase is marked complete:

```bash
npx tsc --noEmit
npx eslint .
npm run build
npm run test
```

Also verify:

- Desktop RTL layout.
- Mobile 375px RTL layout.
- Protected route redirects.
- Empty states.
- Loading states.
- Human-readable Arabic error states.
- AI unavailable state.
- Failed auto-reply reason visible in inbox.
- No secrets in browser network/devtools.

## Final Phase Output Format

```md
## Phase [N] Complete

### What Changed
[Files modified, migrations added, components created]

### User Problems Fixed
[Plain language impact]

### Tests Added
[Test files and coverage]

### Build Status
[TypeScript: pass | ESLint: pass | Build: pass | Tests: pass]

### Depends on External Action
[Meta App Review, funded OpenAI, live Paymob, etc.]

### Next Phase
[Next phase deliverables]
```

## Start Instruction

Begin with Phase 1 only after reading the current codebase and the historical chat/thread.

Before editing:

- Read the relevant code.
- Read the current database/schema files.
- Read CSP implementation.
- Read affected route handlers.
- State initial findings briefly.

Then implement the smallest production-grade changes that move the phase forward.
