-- Phase 9B: advanced Meta social channels.
-- Adapted to the existing user-scoped schema: users, whatsapp_connections,
-- messages, leads, conversation_handoffs, user_settings, and customer_profiles.

ALTER TABLE "user_settings"
  ADD COLUMN IF NOT EXISTS "comment_to_dm_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "comment_to_dm_message" TEXT NOT NULL DEFAULT 'مرحباً! 👋 شكراً لاهتمامك. كيف يمكنني مساعدتك؟',
  ADD COLUMN IF NOT EXISTS "instagram_tone" TEXT NOT NULL DEFAULT 'friendly',
  ADD COLUMN IF NOT EXISTS "messenger_tone" TEXT NOT NULL DEFAULT 'professional',
  ADD COLUMN IF NOT EXISTS "instagram_instructions" TEXT,
  ADD COLUMN IF NOT EXISTS "messenger_instructions" TEXT;

ALTER TABLE "customer_profiles"
  ADD COLUMN IF NOT EXISTS "messenger_psid" TEXT,
  ADD COLUMN IF NOT EXISTS "instagram_igsid" TEXT,
  ADD COLUMN IF NOT EXISTS "instagram_username" TEXT,
  ADD COLUMN IF NOT EXISTS "linked_profile_id" UUID REFERENCES "customer_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD COLUMN IF NOT EXISTS "is_merged" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "customer_profiles_user_id_messenger_psid_idx"
  ON "customer_profiles"("user_id", "messenger_psid");
CREATE INDEX IF NOT EXISTS "customer_profiles_user_id_instagram_igsid_idx"
  ON "customer_profiles"("user_id", "instagram_igsid");
CREATE INDEX IF NOT EXISTS "customer_profiles_linked_profile_id_idx"
  ON "customer_profiles"("linked_profile_id");

ALTER TABLE "leads"
  ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'chat';

ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "leads_channel_check";
ALTER TABLE "leads"
  ADD CONSTRAINT "leads_channel_check"
  CHECK ("channel" IN ('whatsapp', 'instagram', 'messenger'));

ALTER TABLE "conversation_handoffs"
  ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "social_intent" TEXT;

CREATE TABLE IF NOT EXISTS "instagram_comment_leads" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "connection_id" UUID NOT NULL REFERENCES "whatsapp_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "comment_id" TEXT NOT NULL UNIQUE,
  "comment_text" TEXT NOT NULL,
  "commenter_id" TEXT NOT NULL,
  "commenter_name" TEXT,
  "post_id" TEXT,
  "post_caption" TEXT,
  "is_lead" BOOLEAN NOT NULL DEFAULT false,
  "dm_sent" BOOLEAN NOT NULL DEFAULT false,
  "dm_message_id" TEXT,
  "lead_id" UUID REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "instagram_comment_leads_user_id_created_at_idx"
  ON "instagram_comment_leads"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "instagram_comment_leads_user_id_post_id_idx"
  ON "instagram_comment_leads"("user_id", "post_id");
CREATE INDEX IF NOT EXISTS "instagram_comment_leads_connection_id_idx"
  ON "instagram_comment_leads"("connection_id");

ALTER TABLE "instagram_comment_leads" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'instagram_comment_leads'
      AND policyname = 'instagram_comment_leads_manage_own'
  ) THEN
    CREATE POLICY "instagram_comment_leads_manage_own" ON "instagram_comment_leads"
      FOR ALL USING (auth.uid() = "user_id")
      WITH CHECK (auth.uid() = "user_id");
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "instagram_comment_leads" TO authenticated;

CREATE TABLE IF NOT EXISTS "instagram_post_stats" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "connection_id" UUID NOT NULL REFERENCES "whatsapp_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "post_id" TEXT NOT NULL,
  "post_caption" TEXT,
  "post_media_url" TEXT,
  "post_timestamp" TIMESTAMPTZ,
  "comment_count" INTEGER NOT NULL DEFAULT 0,
  "lead_count" INTEGER NOT NULL DEFAULT 0,
  "dm_count" INTEGER NOT NULL DEFAULT 0,
  "last_updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "instagram_post_stats_user_id_post_id_key" UNIQUE ("user_id", "post_id")
);

CREATE INDEX IF NOT EXISTS "instagram_post_stats_user_id_last_updated_at_idx"
  ON "instagram_post_stats"("user_id", "last_updated_at");
CREATE INDEX IF NOT EXISTS "instagram_post_stats_connection_id_idx"
  ON "instagram_post_stats"("connection_id");

ALTER TABLE "instagram_post_stats" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'instagram_post_stats'
      AND policyname = 'instagram_post_stats_manage_own'
  ) THEN
    CREATE POLICY "instagram_post_stats_manage_own" ON "instagram_post_stats"
      FOR ALL USING (auth.uid() = "user_id")
      WITH CHECK (auth.uid() = "user_id");
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "instagram_post_stats" TO authenticated;
