-- Phase 3 additive tables: leads and per-customer handoff state.
-- This preserves the existing flat messages schema and does not alter auth,
-- billing, WhatsApp setup, or knowledge base behavior.

CREATE TABLE IF NOT EXISTS "leads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "message_id" UUID,
    "connection_id" UUID,
    "customer_phone" TEXT NOT NULL,
    "customer_name" TEXT,
    "interest" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'whatsapp',
    "status" TEXT NOT NULL DEFAULT 'new',
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "leads_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "leads_channel_check" CHECK ("channel" IN ('whatsapp', 'instagram')),
    CONSTRAINT "leads_status_check" CHECK ("status" IN ('new', 'contacted', 'converted', 'dismissed'))
);

CREATE INDEX IF NOT EXISTS "leads_user_id_detected_at_idx" ON "leads"("user_id", "detected_at");
CREATE INDEX IF NOT EXISTS "leads_user_id_status_idx" ON "leads"("user_id", "status");
CREATE INDEX IF NOT EXISTS "leads_user_id_channel_idx" ON "leads"("user_id", "channel");
CREATE INDEX IF NOT EXISTS "leads_connection_id_customer_phone_idx" ON "leads"("connection_id", "customer_phone");

ALTER TABLE "leads" ADD CONSTRAINT "leads_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_message_id_fkey"
    FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_connection_id_fkey"
    FOREIGN KEY ("connection_id") REFERENCES "whatsapp_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "leads" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leads_manage_own" ON "leads"
  FOR ALL
  USING ("user_id" = auth.uid())
  WITH CHECK ("user_id" = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "leads" TO authenticated;

CREATE TABLE IF NOT EXISTS "conversation_handoffs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "connection_id" UUID NOT NULL,
    "customer_phone" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "handoff_at" TIMESTAMP(3),
    "resumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "conversation_handoffs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "conversation_handoffs_user_id_connection_id_customer_phone_key"
  ON "conversation_handoffs"("user_id", "connection_id", "customer_phone");
CREATE INDEX IF NOT EXISTS "conversation_handoffs_user_id_active_idx" ON "conversation_handoffs"("user_id", "active");
CREATE INDEX IF NOT EXISTS "conversation_handoffs_connection_id_customer_phone_idx" ON "conversation_handoffs"("connection_id", "customer_phone");

ALTER TABLE "conversation_handoffs" ADD CONSTRAINT "conversation_handoffs_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversation_handoffs" ADD CONSTRAINT "conversation_handoffs_connection_id_fkey"
    FOREIGN KEY ("connection_id") REFERENCES "whatsapp_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "conversation_handoffs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversation_handoffs_manage_own" ON "conversation_handoffs"
  FOR ALL
  USING ("user_id" = auth.uid())
  WITH CHECK ("user_id" = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "conversation_handoffs" TO authenticated;
