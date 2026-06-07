-- [ROLE: BACKEND/SRE/SECURITY ENGINEER]
-- Decision: Additive launch observability tables for AI traceability, webhook
-- idempotency diagnostics, and readiness history. No existing data is renamed
-- or removed.

CREATE TABLE "ai_reply_traces" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "connection_id" UUID,
  "message_id" UUID,
  "trace_id" TEXT NOT NULL,
  "context_bundle" JSONB NOT NULL DEFAULT '{}'::JSONB,
  "reply_text" TEXT,
  "confidence" DOUBLE PRECISION,
  "sources" JSONB NOT NULL DEFAULT '[]'::JSONB,
  "missing_data" JSONB NOT NULL DEFAULT '[]'::JSONB,
  "needs_human" BOOLEAN NOT NULL DEFAULT false,
  "suggested_action" TEXT,
  "outside_working_hours" BOOLEAN NOT NULL DEFAULT false,
  "latency_ms" INTEGER,
  "model" TEXT,
  "tokens_used" INTEGER,
  "failure_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ai_reply_traces_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "webhook_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "provider" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "provider_event_id" TEXT,
  "raw_payload" JSONB NOT NULL DEFAULT '{}'::JSONB,
  "processed" BOOLEAN NOT NULL DEFAULT false,
  "processed_at" TIMESTAMP(3),
  "failure_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "readiness_snapshots" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "score" INTEGER NOT NULL,
  "checks" JSONB NOT NULL DEFAULT '[]'::JSONB,
  "code_issues" JSONB NOT NULL DEFAULT '[]'::JSONB,
  "manual_actions" JSONB NOT NULL DEFAULT '[]'::JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "readiness_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_reply_traces_user_id_created_at_idx" ON "ai_reply_traces"("user_id", "created_at");
CREATE INDEX "ai_reply_traces_connection_id_idx" ON "ai_reply_traces"("connection_id");
CREATE INDEX "ai_reply_traces_message_id_idx" ON "ai_reply_traces"("message_id");
CREATE INDEX "ai_reply_traces_trace_id_idx" ON "ai_reply_traces"("trace_id");

CREATE UNIQUE INDEX "webhook_events_provider_provider_event_id_key" ON "webhook_events"("provider", "provider_event_id");
CREATE INDEX "webhook_events_provider_event_type_created_at_idx" ON "webhook_events"("provider", "event_type", "created_at");
CREATE INDEX "webhook_events_processed_created_at_idx" ON "webhook_events"("processed", "created_at");

CREATE INDEX "readiness_snapshots_user_id_created_at_idx" ON "readiness_snapshots"("user_id", "created_at");
CREATE INDEX "readiness_snapshots_score_idx" ON "readiness_snapshots"("score");

ALTER TABLE "ai_reply_traces"
  ADD CONSTRAINT "ai_reply_traces_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_reply_traces"
  ADD CONSTRAINT "ai_reply_traces_connection_id_fkey"
  FOREIGN KEY ("connection_id") REFERENCES "whatsapp_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ai_reply_traces"
  ADD CONSTRAINT "ai_reply_traces_message_id_fkey"
  FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "readiness_snapshots"
  ADD CONSTRAINT "readiness_snapshots_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_reply_traces" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "readiness_snapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "webhook_events" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_reply_traces_select_own"
  ON "ai_reply_traces"
  FOR SELECT
  TO authenticated
  USING (NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid = "user_id");

CREATE POLICY "readiness_snapshots_select_own"
  ON "readiness_snapshots"
  FOR SELECT
  TO authenticated
  USING (NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid = "user_id");

-- No authenticated policy is created for webhook_events by design. It contains
-- operational provider payloads and is accessed only by server-side service
-- role code and trusted production diagnostics.
