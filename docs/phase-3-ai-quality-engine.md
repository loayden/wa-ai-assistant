# Phase 3 AI Quality Engine

Date: 2026-06-06

Scope: Make AI replies grounded in business data, traceable, and safe when data is missing.

## Implemented Without Database Migration

- Added a shared AI context builder:
  - business profile
  - working hours
  - knowledge entries
  - products
  - corrections
  - customer profile
  - recent conversation history when a connection/customer is known
- Added a structured AI reply contract:
  - `replyText`
  - `confidence`
  - `sources`
  - `missingData`
  - `needsHuman`
  - `suggestedAction`
  - `outsideWorkingHours`
- Added strict anti-hallucination prompt rules.
- Added JSON response mode for OpenAI replies.
- Added preflight guardrails:
  - no business context returns a safe human-handoff reply without calling OpenAI
  - price questions for unknown/unspecified products do not produce invented prices
- Added trace metadata on successful automatic replies:
  - `Message.metadata.aiReplyTrace`
  - confidence, sources, missing data, suggested action, model, tokens, trace id
- Updated the assistant simulator to show:
  - confidence
  - sources used
  - missing data
  - human handling state
  - outside-hours state

## Why No New Table Was Added

The ideal implementation has a dedicated `ai_reply_traces` table. That is a production database migration and should not be applied without a backup, approval, and rollout plan.

For this phase, traces are stored in existing `messages.metadata`, which is additive, reversible, and does not require schema changes.

## Recommended Future Migration

```sql
create table ai_reply_traces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  message_id uuid references messages(id) on delete set null,
  connection_id uuid references whatsapp_connections(id) on delete set null,
  channel text not null,
  model_used text not null,
  tokens_used integer not null default 0,
  confidence numeric(4,3) not null,
  sources jsonb not null default '[]'::jsonb,
  missing_data text[] not null default '{}',
  needs_human boolean not null default false,
  suggested_action text not null,
  outside_working_hours boolean not null default false,
  created_at timestamptz not null default now()
);

create index ai_reply_traces_user_created_idx on ai_reply_traces (user_id, created_at desc);
create index ai_reply_traces_message_idx on ai_reply_traces (message_id);
create index ai_reply_traces_needs_human_idx on ai_reply_traces (user_id, needs_human, created_at desc);
```

## Quality Gates

- AI without context fails safely before provider call.
- Unknown/unspecified product price questions do not invent a price.
- Structured OpenAI JSON output is parsed into a typed response.
- Assistant test API returns confidence and sources.
- Social and WhatsApp automatic replies store trace metadata on the inbound message.

