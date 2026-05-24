-- Phase 5: Meta message templates and broadcast campaigns.
-- Additive only: preserves current WhatsApp connections, webhooks, billing,
-- settings, knowledge, leads, handoff, analytics, and notification behavior.

CREATE TABLE IF NOT EXISTS "message_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "connection_id" UUID,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'ar',
    "header_text" TEXT,
    "body_text" TEXT NOT NULL,
    "footer_text" TEXT,
    "button_text" TEXT,
    "button_url" TEXT,
    "meta_template_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "message_templates_category_check" CHECK ("category" IN ('MARKETING', 'UTILITY', 'AUTHENTICATION')),
    CONSTRAINT "message_templates_language_check" CHECK ("language" IN ('ar', 'en')),
    CONSTRAINT "message_templates_status_check" CHECK ("status" IN ('draft', 'pending', 'approved', 'rejected'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "message_templates_user_id_name_key"
  ON "message_templates"("user_id", "name");
CREATE INDEX IF NOT EXISTS "message_templates_user_id_status_idx"
  ON "message_templates"("user_id", "status");
CREATE INDEX IF NOT EXISTS "message_templates_connection_id_idx"
  ON "message_templates"("connection_id");

ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_connection_id_fkey"
    FOREIGN KEY ("connection_id") REFERENCES "whatsapp_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "message_templates" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "message_templates_manage_own" ON "message_templates"
  FOR ALL
  USING ("user_id" = auth.uid())
  WITH CHECK ("user_id" = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "message_templates" TO authenticated;

CREATE TABLE IF NOT EXISTS "broadcasts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "connection_id" UUID,
    "template_id" UUID,
    "name" TEXT NOT NULL,
    "parameters" JSONB NOT NULL DEFAULT '[]'::JSONB,
    "recipient_count" INTEGER NOT NULL DEFAULT 0,
    "sent_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "scheduled_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "broadcasts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "broadcasts_status_check" CHECK ("status" IN ('draft', 'sending', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS "broadcasts_user_id_created_at_idx"
  ON "broadcasts"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "broadcasts_user_id_status_idx"
  ON "broadcasts"("user_id", "status");
CREATE INDEX IF NOT EXISTS "broadcasts_connection_id_idx"
  ON "broadcasts"("connection_id");
CREATE INDEX IF NOT EXISTS "broadcasts_template_id_idx"
  ON "broadcasts"("template_id");

ALTER TABLE "broadcasts" ADD CONSTRAINT "broadcasts_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "broadcasts" ADD CONSTRAINT "broadcasts_connection_id_fkey"
    FOREIGN KEY ("connection_id") REFERENCES "whatsapp_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "broadcasts" ADD CONSTRAINT "broadcasts_template_id_fkey"
    FOREIGN KEY ("template_id") REFERENCES "message_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "broadcasts" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "broadcasts_manage_own" ON "broadcasts"
  FOR ALL
  USING ("user_id" = auth.uid())
  WITH CHECK ("user_id" = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "broadcasts" TO authenticated;

CREATE TABLE IF NOT EXISTS "broadcast_recipients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "broadcast_id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "broadcast_recipients_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "broadcast_recipients_status_check" CHECK ("status" IN ('pending', 'sent', 'failed'))
);

CREATE INDEX IF NOT EXISTS "broadcast_recipients_broadcast_id_status_idx"
  ON "broadcast_recipients"("broadcast_id", "status");
CREATE INDEX IF NOT EXISTS "broadcast_recipients_phone_idx"
  ON "broadcast_recipients"("phone");

ALTER TABLE "broadcast_recipients" ADD CONSTRAINT "broadcast_recipients_broadcast_id_fkey"
    FOREIGN KEY ("broadcast_id") REFERENCES "broadcasts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "broadcast_recipients" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "broadcast_recipients_manage_own" ON "broadcast_recipients"
  FOR ALL
  USING ("broadcast_id" IN (
    SELECT "id" FROM "broadcasts" WHERE "user_id" = auth.uid()
  ))
  WITH CHECK ("broadcast_id" IN (
    SELECT "id" FROM "broadcasts" WHERE "user_id" = auth.uid()
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "broadcast_recipients" TO authenticated;
