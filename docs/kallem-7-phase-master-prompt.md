# Kallem 7-Phase Master Prompt

Use this prompt when continuing Kallem development. The goal is not to copy respond.io or WhatChimp. The goal is to build a simpler, Arabic-first, more trustworthy product for small businesses that need WhatsApp, Instagram, and Messenger auto-replies without technical setup.

## Core Mission

Act as a principal engineer, product designer, UX strategist, security engineer, QA lead, growth product manager, and technical co-founder.

Build Kallem as an Arabic-first AI customer messaging assistant that helps a normal business owner:

- Connect WhatsApp, Messenger, and Instagram with minimal effort.
- Know clearly whether each channel is actually ready.
- Understand why auto-reply failed, in plain Arabic.
- Train the assistant from business information, products, knowledge, corrections, and previous conversations.
- Reply automatically with accurate, safe, business-specific answers.
- Hand over to a human when confidence is low or the channel cannot send.
- Track readiness, conversations, reply quality, payments, and customer outcomes.

The product must feel premium, modern, clear, mobile-first, RTL-native, and trustworthy. Every screen should tell the user what is happening, what is missing, and what to do next.

## Mandatory Historical Learning

Before starting any phase, learn from this chat and from Codex thread:

`codex://threads/019df5f7-17e7-7ba2-95f6-56897575c025`

If the thread can be read, inspect it first. If it cannot be read, use the embedded lessons below as hard requirements.

Do not repeat these past problems:

1. Meta permissions were shown as missing even when the token had them.
   - Root cause: relying only on `/me/permissions` for a Page token produced incomplete permission detection.
   - Required fix: read permissions through both `/me/permissions` and `debug_token`, merge results, store a clear permission state, and never show `partial` when required scopes are actually granted.

2. Messenger appeared disconnected or partial after successful OAuth.
   - Required fix: after OAuth, verify Page token scopes, subscribe the Page to webhook fields, persist `webhookSubscribed`, `permissionStatus`, `isActive`, and `isVerified`, then show a clear connected state.

3. Instagram connection failed with `Invalid redirect_uri`.
   - Required fix: validate every Instagram OAuth redirect URI against Meta app settings and production URL before showing the connect button as ready.
   - Required UX: if redirect URI is wrong, show the exact redirect URI that must be added in Meta, with copy button.

4. Instagram was not linked to the Facebook Page.
   - Required fix: detect whether the selected Page has `instagram_business_account`.
   - Required UX: if missing, explain in Arabic that the Instagram Professional account must be linked to the Facebook Page in Business Settings before Kallem can reply.

5. Instagram and Messenger cannot be claimed production-ready without Meta App Review.
   - Required fix: readiness checks must distinguish between "connected for testing" and "approved for public customers".
   - Required UX: show approval status and next action, not vague failure text.

6. Auto-reply failed with generic messages such as "assistant unavailable temporarily" or "Thanks for your message. A team member will follow up soon."
   - Required fix: every failed auto-reply must store and display a classified reason:
     - OpenAI quota or billing issue.
     - Missing or invalid API key.
     - Assistant disabled.
     - Business knowledge missing.
     - Low AI confidence.
     - Meta token expired.
     - Page webhook not subscribed.
     - WhatsApp test number limitation.
     - WhatsApp template or 24-hour window restriction.
     - Instagram/Messenger permission not approved.
     - Channel delivery error.
     - Manual human handover enabled.
   - Required UX: show "لم يتم إرسال الرد التلقائي" plus the real reason and the exact fix.

7. Manual reply failed with a generic request error.
   - Required fix: manual replies must use the same channel adapter diagnostics as auto-replies, store an outbox record, retry only safe transient failures, and show a human-readable failure reason.

8. The assistant did not always use business data.
   - Required fix: every AI reply must use a structured context bundle from business profile, products, knowledge base, corrections, working hours, policies, and conversation history.
   - Required UX: in test mode, show the sources used by the assistant.

9. Business information text limit was too small.
   - Required fix: business description should support at least 1000 characters and feed directly into the assistant context.

10. Adding a knowledge question failed with unclear Arabic copy.
    - Required fix: validate required fields clearly, preserve user input after failure, show field-level errors, and log API validation details safely.

11. CSP blocked production scripts and analytics.
    - Known examples: `https://vercel.live` and `https://www.google-analytics.com/mp/collect`.
    - Required fix: update CSP intentionally for needed production services while keeping the policy strict. Do not use broad wildcards unless justified.

12. React hydration error appeared in production.
    - Required fix: audit any server/client text mismatch, locale date formatting, random values, client-only state, and dynamic RTL text rendered during hydration.

13. Protected pages could show a shell or blank content when unauthenticated.
    - Required fix: protected dashboard pages must redirect to `/login?next=<path>` consistently.

14. Users were confused by technical Meta/OpenAI/Paymob details.
    - Required UX: hide internal provider jargon from normal users, but keep detailed diagnostics for admin/readiness screens.

15. Production readiness depended on manual external setup.
    - Required fix: readiness score must clearly separate code issues from manual production actions:
      - Live Paymob keys.
      - Funded OpenAI account.
      - Meta App Review.
      - Production WhatsApp Business number.
      - Google OAuth branding.
      - Supabase email templates.
      - Webhook subscriptions.

## Competitive Positioning

Use respond.io and WhatChimp only as market references. Do not copy their structure, language, UI, or feature clutter.

Kallem must win by being:

- Arabic-first and RTL-native.
- Faster to understand.
- Easier to launch.
- More honest about what is connected, approved, and failing.
- Better at AI answer quality for local businesses.
- Better at diagnosing WhatsApp, Messenger, and Instagram delivery issues.
- Cleaner and less overwhelming than enterprise inbox products.
- Focused on SMB revenue outcomes: replies, leads, orders, follow-up, and trust.

## Seven Execution Phases

### Phase 1: Audit, Readiness, And Historical Bug Ledger

Start by auditing the current app, current code, and historical problems from this chat/thread.

Deliver:

- A readiness score that checks WhatsApp, Messenger, Instagram, OpenAI, knowledge base, business info, products, payment, webhooks, templates, and production/manual requirements.
- A regression checklist for every historical problem listed above.
- Protected page redirect fixes.
- Clear Arabic readiness copy.
- Tests for readiness checks and auth redirects.

Do not continue to later phases until readiness can explain what is ready, what is blocked, and why.

### Phase 2: Integration Reliability For Meta Channels

Make WhatsApp, Messenger, and Instagram connection states reliable.

Deliver:

- Unified `IntegrationConnection` model or equivalent normalized channel state.
- Permission detection using both direct Graph APIs and `debug_token`.
- Page webhook subscription verification.
- Instagram Page-link detection.
- Redirect URI validation.
- Token expiry detection.
- Production vs testing status.
- Arabic setup steps with copy buttons for URLs and missing settings.
- Tests for permission parsing, partial/granted states, webhook subscription state, and invalid redirect URI handling.

Every channel card must answer:

- هل القناة متصلة؟
- هل تصلح للتجربة فقط أم للعملاء الحقيقيين؟
- ما المشكلة إن لم تكن جاهزة؟
- ما الخطوة التالية بالضبط؟

### Phase 3: AI Quality Engine And Context Control

Make the assistant answer from the business data, not from generic model guessing.

Deliver:

- Structured AI context builder using:
  - Business profile.
  - Products.
  - Knowledge questions.
  - Corrections.
  - Policies.
  - Working hours.
  - Customer/conversation history.
- Reply output with:
  - Final answer.
  - Confidence.
  - Sources used.
  - Missing data.
  - Needs human flag.
  - Suggested follow-up action.
- AI reply trace stored for each attempt.
- Safe fallback behavior when OpenAI quota/billing/API fails.
- Test assistant screen that shows answer, confidence, and sources.
- Strict rule: never invent prices, products, availability, delivery times, approvals, or policies.

### Phase 4: Inbox, Outbox, Auto-Reply, And Manual Reply Reliability

Make the messages page operationally clear.

Deliver:

- Unified conversation view across WhatsApp, Messenger, Instagram.
- Outbox table/state for pending, sent, failed, retrying, and blocked messages.
- Exact failure reason for auto and manual replies.
- Safe retry logic for transient errors only.
- Human handover state that explains when auto-reply stops.
- Clear Arabic empty/loading/error states.
- Message timeline that shows inbound message, AI decision, delivery attempt, and channel response.

The user should never see only "failed request" or "assistant unavailable" without a real reason and fix.

### Phase 5: Onboarding, Knowledge, Products, And Usability

Make first-time setup understandable within seconds.

Deliver:

- Guided onboarding that asks only for the minimum needed to launch.
- Business description limit at least 1000 characters.
- Knowledge question creation with field-level validation and preserved input.
- Product discovery and product-aware answer testing.
- Clear mobile-first RTL layouts.
- Reduced clutter and stronger hierarchy across dashboard, connect, knowledge, messages, settings, products, and billing.
- Consistent buttons, icons, spacing, and typography.

Every page must have one clear primary action.

### Phase 6: Conversion, Trust, Pricing, And Public Positioning

Make Kallem easier to buy and trust than competitors.

Deliver:

- Public pages for:
  - WhatsApp AI assistant.
  - Instagram and Messenger assistant.
  - Pricing.
  - Security/trust.
  - Compare with respond.io.
  - Compare with WhatChimp.
- Arabic-first value proposition.
- Local pricing clarity.
- Trust signals: privacy, secure tokens, Meta approval status, support, readiness checks.
- Short buying journey with minimal clicks.
- Payment state that distinguishes test keys from live production keys.

Do not create a generic landing page. Show the actual product value and operational clarity.

### Phase 7: Security, Observability, QA, And Production Release

Make the system operable in production.

Deliver:

- Tenant-scoped authorization on every API.
- No secret/token exposure in client or logs.
- Strict CSP with explicit allowlist.
- Webhook signature verification.
- Rate limiting for auth, AI, webhooks, and message send paths.
- Structured logs for every integration failure.
- Tests for happy paths, failure paths, and security boundaries.
- Build, lint, typecheck, unit tests, and targeted browser checks.
- Release checklist covering Vercel, Supabase, Meta, Paymob, OpenAI, OAuth branding, and production webhooks.

## Non-Negotiable Product Rules

- Never show fake success.
- Never say Instagram, Messenger, WhatsApp, payment, or AI is ready unless it is actually ready for the relevant environment.
- Never hide a failure behind vague text.
- Never expose tokens or provider secrets.
- Never require a normal customer to paste an API token.
- Never let the AI answer without business context unless explicitly marked as fallback.
- Never make the UI more complex to imitate enterprise competitors.
- Prefer one clear next step over multiple technical explanations.

## Verification Before Completion

Before marking any phase complete:

- Run relevant unit tests.
- Run TypeScript.
- Run lint on touched files.
- Run build for substantial changes.
- Test the affected user flow in browser when feasible.
- Confirm Arabic RTL UI does not overflow or overlap on mobile and desktop.
- Confirm failure states are visible and understandable.
- Confirm no secrets were printed, committed, or exposed.

Final output for every phase must include:

- What changed.
- What user problem it fixes.
- What was tested.
- What still depends on external approval or production credentials.
- Next recommended phase.
