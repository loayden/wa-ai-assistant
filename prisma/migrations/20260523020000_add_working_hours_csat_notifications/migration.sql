-- Phase 4: working hours, customer ratings, and owner notifications.
-- Additive only: preserves existing message, webhook, billing, and auth data.

ALTER TABLE "user_settings"
  ADD COLUMN IF NOT EXISTS "working_hours_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "working_hours_start" TEXT NOT NULL DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS "working_hours_end" TEXT NOT NULL DEFAULT '22:00',
  ADD COLUMN IF NOT EXISTS "working_days" TEXT[] NOT NULL DEFAULT ARRAY['saturday','sunday','monday','tuesday','wednesday','thursday']::TEXT[],
  ADD COLUMN IF NOT EXISTS "off_hours_message" TEXT NOT NULL DEFAULT 'شكراً لتواصلك 🙏 نحن حالياً خارج أوقات العمل. سنرد عليك فور بدء الدوام.',
  ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'Africa/Cairo',
  ADD COLUMN IF NOT EXISTS "csat_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "notification_prefs" JSONB NOT NULL DEFAULT '{"angry":true,"lead":true,"handoff":true,"daily_summary":false,"ai_failed":true}'::JSONB;

ALTER TABLE "conversation_handoffs"
  ADD COLUMN IF NOT EXISTS "resolved_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rating" INTEGER,
  ADD COLUMN IF NOT EXISTS "rating_requested_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "notified_events" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'conversation_handoffs_rating_check'
  ) THEN
    ALTER TABLE "conversation_handoffs"
      ADD CONSTRAINT "conversation_handoffs_rating_check"
      CHECK ("rating" IS NULL OR ("rating" >= 1 AND "rating" <= 5));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "conversation_handoffs_user_id_resolved_at_idx"
  ON "conversation_handoffs"("user_id", "resolved_at");
