# Phase 2 Meta Integration Reliability Plan

Date: 2026-06-06

Scope: WhatsApp, Messenger, and Instagram connection reliability.

## What Was Implemented Without Database Changes

- Meta Page token inspection now merges `/me/permissions` with `debug_token` and returns safe diagnostics:
  - granted permissions
  - whether each source responded
  - token type
  - token expiry when Meta returns it
- Messenger webhook subscription now performs POST and then verifies via `/{pageId}/subscribed_apps`.
- Kallem stores `webhookSubscribed=true` only after verification lists the current Meta app.
- The connect page response now returns safe metadata:
  - `tokenExpiresAt`
  - `permissionSources`
- The UI blocks Meta OAuth when the current browser origin does not match `NEXT_PUBLIC_APP_URL`.
- The UI shows the exact redirect URI to add in Meta Developer Console.
- Instagram setup now uses a shared Arabic guidance message when the selected Page has no linked Instagram Business account.

## Why No Migration Was Applied

Phase 2 ideally needs a normalized `integration_connections` table and explicit fields:

- `productionReady`
- `metaAppReviewStatus`
- `redirectUriValidated`
- `tokenExpiresAt`
- `lastWebhookVerifiedAt`
- structured `permissionStatus`

Applying this schema is production-impacting. It should be additive, backed up, and deployed before production logic depends on it.

## Recommended Additive Migration

Create `integration_connections` while leaving `whatsapp_connections` untouched:

```sql
create table integration_connections (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references users(id) on delete cascade,
  legacy_connection_id uuid references whatsapp_connections(id) on delete set null,
  channel_type text not null check (channel_type in ('whatsapp', 'messenger', 'instagram')),
  provider text not null default 'meta',
  page_id text,
  instagram_account_id text,
  display_name text,
  encrypted_access_token text,
  permissions text[] not null default '{}',
  permission_status jsonb not null default '{}'::jsonb,
  webhook_subscribed boolean not null default false,
  production_ready boolean not null default false,
  meta_app_review_status text not null default 'unknown',
  redirect_uri_validated boolean not null default false,
  token_expires_at timestamptz,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index integration_connections_business_channel_idx on integration_connections (business_id, channel_type);
create index integration_connections_status_idx on integration_connections (business_id, production_ready, webhook_subscribed);
create index integration_connections_page_idx on integration_connections (page_id);
create index integration_connections_instagram_idx on integration_connections (instagram_account_id);
```

## Rollout Plan

1. Add table and indexes only.
2. Backfill from `whatsapp_connections` into `integration_connections`.
3. Read from both tables and compare results in logs.
4. Move channel cards to read from `integration_connections`.
5. Move write paths to dual-write.
6. After stable production run, make `integration_connections` primary.
7. Keep `whatsapp_connections` as compatibility storage until a later cleanup phase.

## Rollback Plan

- If migration fails before deploy: revert migration and redeploy current code.
- If dual-read fails: turn off feature flag and read from `whatsapp_connections`.
- If dual-write causes errors: stop writing to `integration_connections`; existing production flow remains on `whatsapp_connections`.

## Approval Required

Do not apply this migration to production without:

- A recent Supabase backup.
- Confirmation of target environment.
- Explicit approval to run migration.
- A deployment window.
