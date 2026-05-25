-- Phase 9A: Meta social channels foundation.
-- Additive only: extends the existing user-scoped WhatsApp connection/message
-- model so Messenger and Instagram can share the same inbox and AI pipeline.

ALTER TABLE "whatsapp_connections"
  ADD COLUMN IF NOT EXISTS "channel" TEXT NOT NULL DEFAULT 'whatsapp',
  ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'meta',
  ADD COLUMN IF NOT EXISTS "facebook_page_id" TEXT,
  ADD COLUMN IF NOT EXISTS "facebook_page_name" TEXT,
  ADD COLUMN IF NOT EXISTS "facebook_page_picture" TEXT,
  ADD COLUMN IF NOT EXISTS "instagram_account_id" TEXT,
  ADD COLUMN IF NOT EXISTS "instagram_username" TEXT,
  ADD COLUMN IF NOT EXISTS "instagram_profile_picture" TEXT,
  ADD COLUMN IF NOT EXISTS "page_access_token_encrypted" TEXT,
  ADD COLUMN IF NOT EXISTS "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "permission_status" TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS "last_verified_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "webhook_subscribed" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "messages"
  ADD COLUMN IF NOT EXISTS "channel" TEXT NOT NULL DEFAULT 'whatsapp',
  ADD COLUMN IF NOT EXISTS "external_message_id" TEXT,
  ADD COLUMN IF NOT EXISTS "external_thread_id" TEXT,
  ADD COLUMN IF NOT EXISTS "sender_name" TEXT,
  ADD COLUMN IF NOT EXISTS "sender_profile_pic_url" TEXT,
  ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}';

ALTER TABLE "leads"
  ADD COLUMN IF NOT EXISTS "external_id" TEXT,
  ADD COLUMN IF NOT EXISTS "sender_name" TEXT;

CREATE INDEX IF NOT EXISTS "whatsapp_connections_user_id_channel_idx"
  ON "whatsapp_connections"("user_id", "channel");
CREATE INDEX IF NOT EXISTS "whatsapp_connections_channel_idx"
  ON "whatsapp_connections"("channel");
CREATE INDEX IF NOT EXISTS "whatsapp_connections_facebook_page_id_idx"
  ON "whatsapp_connections"("facebook_page_id");
CREATE INDEX IF NOT EXISTS "whatsapp_connections_instagram_account_id_idx"
  ON "whatsapp_connections"("instagram_account_id");

CREATE INDEX IF NOT EXISTS "messages_user_id_channel_idx"
  ON "messages"("user_id", "channel");
CREATE INDEX IF NOT EXISTS "messages_channel_idx"
  ON "messages"("channel");
CREATE INDEX IF NOT EXISTS "messages_external_message_id_idx"
  ON "messages"("external_message_id");
CREATE INDEX IF NOT EXISTS "messages_external_thread_id_idx"
  ON "messages"("external_thread_id");

CREATE INDEX IF NOT EXISTS "leads_user_id_external_id_idx"
  ON "leads"("user_id", "external_id");
