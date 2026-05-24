-- Phase 8: admin visibility, first-party support tickets, trials, and usage alerts.
-- Additive only: preserves existing app users, WhatsApp connections, billing,
-- webhook routing, knowledge, leads, analytics, orders, and campaign data.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "is_admin" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "trial_ends_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "trial_used" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "usage_alert_80_sent_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "usage_alert_100_sent_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "users_is_admin_idx" ON "users"("is_admin");
CREATE INDEX IF NOT EXISTS "users_trial_ends_at_idx" ON "users"("trial_ends_at");

CREATE TABLE IF NOT EXISTS "support_tickets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "subject" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_tickets_category_check') THEN
    ALTER TABLE "support_tickets"
      ADD CONSTRAINT "support_tickets_category_check"
      CHECK ("category" IN ('technical', 'billing', 'feature_request', 'other'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_tickets_priority_check') THEN
    ALTER TABLE "support_tickets"
      ADD CONSTRAINT "support_tickets_priority_check"
      CHECK ("priority" IN ('low', 'normal', 'high', 'urgent'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_tickets_status_check') THEN
    ALTER TABLE "support_tickets"
      ADD CONSTRAINT "support_tickets_status_check"
      CHECK ("status" IN ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "support_tickets_user_id_created_at_idx"
  ON "support_tickets"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "support_tickets_status_priority_idx"
  ON "support_tickets"("status", "priority");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_tickets_user_id_fkey') THEN
    ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "support_tickets" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_tickets_manage_own" ON "support_tickets";
CREATE POLICY "support_tickets_manage_own" ON "support_tickets"
  FOR ALL
  USING ("user_id" = auth.uid())
  WITH CHECK ("user_id" = auth.uid());

DROP POLICY IF EXISTS "support_tickets_admin_manage_all" ON "support_tickets";
CREATE POLICY "support_tickets_admin_manage_all" ON "support_tickets"
  FOR ALL
  USING (EXISTS (SELECT 1 FROM "users" WHERE "users"."id" = auth.uid() AND "users"."is_admin" = true))
  WITH CHECK (EXISTS (SELECT 1 FROM "users" WHERE "users"."id" = auth.uid() AND "users"."is_admin" = true));

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "support_tickets" TO authenticated;

CREATE TABLE IF NOT EXISTS "ticket_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticket_id" UUID NOT NULL,
    "sender" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ticket_messages_sender_check') THEN
    ALTER TABLE "ticket_messages"
      ADD CONSTRAINT "ticket_messages_sender_check"
      CHECK ("sender" IN ('customer', 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ticket_messages_ticket_id_fkey') THEN
    ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticket_id_fkey"
      FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ticket_messages_ticket_id_created_at_idx"
  ON "ticket_messages"("ticket_id", "created_at");

ALTER TABLE "ticket_messages" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ticket_messages_manage_own" ON "ticket_messages";
CREATE POLICY "ticket_messages_manage_own" ON "ticket_messages"
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM "support_tickets"
    WHERE "support_tickets"."id" = "ticket_messages"."ticket_id"
      AND "support_tickets"."user_id" = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "support_tickets"
    WHERE "support_tickets"."id" = "ticket_messages"."ticket_id"
      AND "support_tickets"."user_id" = auth.uid()
  ));

DROP POLICY IF EXISTS "ticket_messages_admin_manage_all" ON "ticket_messages";
CREATE POLICY "ticket_messages_admin_manage_all" ON "ticket_messages"
  FOR ALL
  USING (EXISTS (SELECT 1 FROM "users" WHERE "users"."id" = auth.uid() AND "users"."is_admin" = true))
  WITH CHECK (EXISTS (SELECT 1 FROM "users" WHERE "users"."id" = auth.uid() AND "users"."is_admin" = true));

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "ticket_messages" TO authenticated;

CREATE TABLE IF NOT EXISTS "admin_outreach" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_outreach_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "admin_outreach_user_id_sent_at_idx"
  ON "admin_outreach"("user_id", "sent_at");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admin_outreach_user_id_fkey') THEN
    ALTER TABLE "admin_outreach" ADD CONSTRAINT "admin_outreach_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
