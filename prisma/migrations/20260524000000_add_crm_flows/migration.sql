-- CRM, WhatsApp flows, and appointments.
-- Additive only: keeps the existing user-scoped tenant model and does not
-- modify or delete existing customer, message, billing, or WhatsApp data.

CREATE TABLE IF NOT EXISTS "customer_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'whatsapp',
    "instagram_id" TEXT,
    "first_contact_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_contact_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total_conversations" INTEGER NOT NULL DEFAULT 0,
    "total_messages_sent" INTEGER NOT NULL DEFAULT 0,
    "total_orders" INTEGER NOT NULL DEFAULT 0,
    "total_spent_piastres" INTEGER NOT NULL DEFAULT 0,
    "dominant_mood" TEXT NOT NULL DEFAULT 'neutral',
    "mood_history" JSONB NOT NULL DEFAULT '[]',
    "common_topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "customer_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "customer_profiles_user_id_phone_key"
  ON "customer_profiles"("user_id", "phone");
CREATE INDEX IF NOT EXISTS "customer_profiles_user_id_last_contact_at_idx"
  ON "customer_profiles"("user_id", "last_contact_at");
CREATE INDEX IF NOT EXISTS "customer_profiles_user_id_channel_idx"
  ON "customer_profiles"("user_id", "channel");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_profiles_user_id_fkey') THEN
    ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "customer_profiles" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_profiles_manage_own" ON "customer_profiles";
CREATE POLICY "customer_profiles_manage_own" ON "customer_profiles"
  FOR ALL
  USING ("user_id" = auth.uid())
  WITH CHECK ("user_id" = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "customer_profiles" TO authenticated;

CREATE TABLE IF NOT EXISTS "customer_profile_facts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "fact" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'ai',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customer_profile_facts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "customer_profile_facts_profile_id_created_at_idx"
  ON "customer_profile_facts"("profile_id", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_profile_facts_profile_id_fkey') THEN
    ALTER TABLE "customer_profile_facts" ADD CONSTRAINT "customer_profile_facts_profile_id_fkey"
      FOREIGN KEY ("profile_id") REFERENCES "customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "customer_profile_facts" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_profile_facts_manage_own" ON "customer_profile_facts";
CREATE POLICY "customer_profile_facts_manage_own" ON "customer_profile_facts"
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM "customer_profiles"
    WHERE "customer_profiles"."id" = "customer_profile_facts"."profile_id"
      AND "customer_profiles"."user_id" = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "customer_profiles"
    WHERE "customer_profiles"."id" = "customer_profile_facts"."profile_id"
      AND "customer_profiles"."user_id" = auth.uid()
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "customer_profile_facts" TO authenticated;

CREATE TABLE IF NOT EXISTS "whatsapp_flows" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "flow_json" JSONB NOT NULL DEFAULT '{}',
    "meta_flow_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "trigger_keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "auto_trigger" BOOLEAN NOT NULL DEFAULT false,
    "response_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "whatsapp_flows_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "whatsapp_flows_user_id_status_idx"
  ON "whatsapp_flows"("user_id", "status");
CREATE INDEX IF NOT EXISTS "whatsapp_flows_user_id_auto_trigger_idx"
  ON "whatsapp_flows"("user_id", "auto_trigger");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_flows_user_id_fkey') THEN
    ALTER TABLE "whatsapp_flows" ADD CONSTRAINT "whatsapp_flows_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "whatsapp_flows" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_flows_manage_own" ON "whatsapp_flows";
CREATE POLICY "whatsapp_flows_manage_own" ON "whatsapp_flows"
  FOR ALL
  USING ("user_id" = auth.uid())
  WITH CHECK ("user_id" = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "whatsapp_flows" TO authenticated;

CREATE TABLE IF NOT EXISTS "flow_responses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "flow_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "connection_id" UUID,
    "customer_phone" TEXT NOT NULL,
    "response_data" JSONB NOT NULL DEFAULT '{}',
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "flow_responses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "flow_responses_user_id_created_at_idx"
  ON "flow_responses"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "flow_responses_flow_id_created_at_idx"
  ON "flow_responses"("flow_id", "created_at");
CREATE INDEX IF NOT EXISTS "flow_responses_user_id_processed_idx"
  ON "flow_responses"("user_id", "processed");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'flow_responses_flow_id_fkey') THEN
    ALTER TABLE "flow_responses" ADD CONSTRAINT "flow_responses_flow_id_fkey"
      FOREIGN KEY ("flow_id") REFERENCES "whatsapp_flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'flow_responses_user_id_fkey') THEN
    ALTER TABLE "flow_responses" ADD CONSTRAINT "flow_responses_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'flow_responses_connection_id_fkey') THEN
    ALTER TABLE "flow_responses" ADD CONSTRAINT "flow_responses_connection_id_fkey"
      FOREIGN KEY ("connection_id") REFERENCES "whatsapp_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "flow_responses" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "flow_responses_manage_own" ON "flow_responses";
CREATE POLICY "flow_responses_manage_own" ON "flow_responses"
  FOR ALL
  USING ("user_id" = auth.uid())
  WITH CHECK ("user_id" = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "flow_responses" TO authenticated;

CREATE TABLE IF NOT EXISTS "appointments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "customer_phone" TEXT NOT NULL,
    "customer_name" TEXT,
    "service" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "time" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "flow_response_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "appointments_user_id_date_idx"
  ON "appointments"("user_id", "date");
CREATE INDEX IF NOT EXISTS "appointments_user_id_status_idx"
  ON "appointments"("user_id", "status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointments_user_id_fkey') THEN
    ALTER TABLE "appointments" ADD CONSTRAINT "appointments_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointments_flow_response_id_fkey') THEN
    ALTER TABLE "appointments" ADD CONSTRAINT "appointments_flow_response_id_fkey"
      FOREIGN KEY ("flow_response_id") REFERENCES "flow_responses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "appointments" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appointments_manage_own" ON "appointments";
CREATE POLICY "appointments_manage_own" ON "appointments"
  FOR ALL
  USING ("user_id" = auth.uid())
  WITH CHECK ("user_id" = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "appointments" TO authenticated;
