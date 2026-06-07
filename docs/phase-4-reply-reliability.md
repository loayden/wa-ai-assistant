# Phase 4 Inbox, Outbox, And Reply Reliability

Date: 2026-06-06

Scope: make auto/manual reply failures visible, classified, retryable when safe, and auditable.

## Implemented

- Added shared outbound failure classification:
  - Meta test recipient blocked
  - missing permissions
  - invalid/expired token
  - rate limit
  - unreachable recipient
  - closed session window
  - provider unavailable
  - network error
  - unknown
- Added retry policy per failure:
  - transient failures are retryable
  - setup/customer/action failures are not retryable until fixed
- Manual reply failures now create a visible failed outbound message instead of disappearing.
- Outbound attempt metadata is stored in `Message.metadata.outboundAttempt`.
- Auto replies for WhatsApp, Instagram, and Messenger now attach delivery attempt metadata.
- Added `outbound_messages` as a dedicated delivery audit/retry table in Prisma and migration SQL.
- Added `/api/cron/process-outbox` to retry only transient failures in bounded batches.
- Added Vercel cron config for outbox processing every 5 minutes after deployment.
- Conversation UI reads the failure metadata and shows:
  - clear Arabic reason
  - exact fix hint
  - next action link
  - retry guidance
- Message row expansion also shows the classified failure reason.

## Outbox Status Lifecycle

- `PENDING`: outbox record exists before the first send attempt starts.
- `SENDING`: send attempt is currently in progress.
- `SENT`: provider accepted the message and returned a provider message id when available.
- `FAILED`: transient failure; `nextAttemptAt` is set and cron can retry.
- `RETRYING`: cron has claimed a transient failure and is actively retrying it.
- `BLOCKED`: setup/customer/action failure, or retry attempts are exhausted.

Retries are allowed only for transient failures:

- rate limit
- provider unavailable
- network/timeout

Retries are blocked for setup or customer-action failures:

- Meta test recipient restrictions
- missing permissions
- invalid/expired token
- recipient unreachable
- closed session window
- unknown non-transient errors

## Metadata Shape

```json
{
  "outboxId": "00000000-0000-0000-0000-000000000001",
  "outboundAttempt": {
    "version": "outbound-attempt-v1",
    "channel": "whatsapp",
    "direction": "manual",
    "stage": "blocked",
    "attemptedAt": "2026-06-06T00:00:00.000Z",
    "providerMessageId": null,
    "failure": {
      "code": "meta_test_recipient_blocked",
      "title": "رقم الاختبار لا يمكنه مراسلة هذا العميل",
      "userMessage": "لم يتم إرسال الرد...",
      "fixHint": "افتح إعداد القنوات...",
      "actionLabel": "فتح إعداد القنوات",
      "actionHref": "/connect",
      "retry": {
        "canRetry": false,
        "reason": "requires_setup"
      }
    }
  }
}
```

## Production Rollout Note

The code and migration are ready, but applying `prisma/migrations/20260606033000_add_outbound_messages/migration.sql`
to Supabase is production-impacting. Before deployment:

- back up Supabase
- apply the migration in a controlled window
- confirm `CRON_SECRET` exists in Vercel Production
- deploy and verify `/api/cron/process-outbox` with the bearer token
- test a retryable failure in a controlled account

## Quality Gates

- Manual reply failure creates a failed outbound message.
- Failure reason is classified and user-facing.
- Retry policy distinguishes transient from setup/customer-action failures.
- Conversation UI does not show a generic request error when a classified failure exists.
- `tests/unit/outbox-processor.test.ts` covers retry success, scheduled transient failure, and exhausted retry blocking.
