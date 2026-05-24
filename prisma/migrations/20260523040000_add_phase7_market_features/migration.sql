-- Phase 7: market-facing automation features.
-- Additive only: preserves auth, billing, WhatsApp connections, existing
-- webhook routing, knowledge, analytics, notifications, templates, and broadcasts.

ALTER TABLE "messages"
  ADD COLUMN IF NOT EXISTS "metadata" JSONB NOT NULL DEFAULT '{}'::JSONB;

CREATE TABLE IF NOT EXISTS "products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "name_en" TEXT,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "category" TEXT,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "products_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "products_price_check" CHECK ("price" >= 0)
);

CREATE INDEX IF NOT EXISTS "products_user_id_sort_order_idx"
  ON "products"("user_id", "sort_order");
CREATE INDEX IF NOT EXISTS "products_user_id_is_available_idx"
  ON "products"("user_id", "is_available");

ALTER TABLE "products" ADD CONSTRAINT "products_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_manage_own" ON "products"
  FOR ALL
  USING ("user_id" = auth.uid())
  WITH CHECK ("user_id" = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "products" TO authenticated;

CREATE TABLE IF NOT EXISTS "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "connection_id" UUID NOT NULL,
    "customer_phone" TEXT NOT NULL,
    "customer_name" TEXT,
    "customer_address" TEXT,
    "items" JSONB NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "notes" TEXT,
    "payment_link" TEXT,
    "payment_link_sent_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "orders_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "orders_subtotal_check" CHECK ("subtotal" >= 0),
    CONSTRAINT "orders_status_check" CHECK ("status" IN ('new','confirmed','preparing','delivered','cancelled'))
);

CREATE INDEX IF NOT EXISTS "orders_user_id_created_at_idx"
  ON "orders"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "orders_user_id_status_idx"
  ON "orders"("user_id", "status");
CREATE INDEX IF NOT EXISTS "orders_connection_id_customer_phone_idx"
  ON "orders"("connection_id", "customer_phone");

ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_connection_id_fkey"
    FOREIGN KEY ("connection_id") REFERENCES "whatsapp_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_manage_own" ON "orders"
  FOR ALL
  USING ("user_id" = auth.uid())
  WITH CHECK ("user_id" = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "orders" TO authenticated;

CREATE TABLE IF NOT EXISTS "ai_corrections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "original_customer_message" TEXT NOT NULL,
    "wrong_ai_reply" TEXT NOT NULL,
    "correct_reply" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_corrections_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ai_corrections_user_id_created_at_idx"
  ON "ai_corrections"("user_id", "created_at");

ALTER TABLE "ai_corrections" ADD CONSTRAINT "ai_corrections_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_corrections" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_corrections_manage_own" ON "ai_corrections"
  FOR ALL
  USING ("user_id" = auth.uid())
  WITH CHECK ("user_id" = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "ai_corrections" TO authenticated;

CREATE TABLE IF NOT EXISTS "routing_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "keywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "action" TEXT NOT NULL,
    "target_phone" TEXT,
    "target_email" TEXT,
    "custom_ai_instruction" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "routing_rules_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "routing_rules_topic_check" CHECK ("topic" IN ('billing','complaint','order','product_inquiry','appointment','custom','other')),
    CONSTRAINT "routing_rules_action_check" CHECK ("action" IN ('ai_reply','handoff','notify_email','notify_whatsapp'))
);

CREATE INDEX IF NOT EXISTS "routing_rules_user_id_is_active_idx"
  ON "routing_rules"("user_id", "is_active");
CREATE INDEX IF NOT EXISTS "routing_rules_user_id_topic_idx"
  ON "routing_rules"("user_id", "topic");

ALTER TABLE "routing_rules" ADD CONSTRAINT "routing_rules_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "routing_rules" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "routing_rules_manage_own" ON "routing_rules"
  FOR ALL
  USING ("user_id" = auth.uid())
  WITH CHECK ("user_id" = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "routing_rules" TO authenticated;
