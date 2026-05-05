-- FILE: prisma/migrations/20260505054000_init/migration.sql
-- [ROLE: BACKEND ENGINEER]
-- Decision: The initial migration mirrors the Prisma schema so Render can run
-- `prisma migrate deploy` against Supabase without requiring `migrate dev`.

-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'PRO');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PAST_DUE', 'CANCELED');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'REPLIED', 'FAILED', 'IGNORED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT,
    "avatar_url" TEXT,
    "plan_tier" "PlanTier" NOT NULL DEFAULT 'FREE',
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "subscription_status" "SubscriptionStatus" NOT NULL DEFAULT 'INACTIVE',
    "monthly_reply_count" INTEGER NOT NULL DEFAULT 0,
    "reply_count_reset_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_connections" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "phone_number_id" TEXT NOT NULL,
    "business_account_id" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "webhook_verify_token" TEXT NOT NULL,
    "display_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "connection_id" UUID NOT NULL,
    "wa_message_id" TEXT NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "from_number" TEXT NOT NULL,
    "to_number" TEXT NOT NULL,
    "body_text" TEXT NOT NULL,
    "media_url" TEXT,
    "media_type" TEXT,
    "status" "MessageStatus" NOT NULL DEFAULT 'RECEIVED',
    "ai_reply_text" TEXT,
    "ai_model_used" TEXT,
    "ai_tokens_used" INTEGER,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "system_prompt" TEXT NOT NULL DEFAULT 'You are a helpful business assistant for {businessName}. Your role is to respond
to customer WhatsApp messages in a friendly, professional, and concise manner.
Always stay on topic. If you cannot help with something, politely direct the
customer to contact a human agent. Respond in {language}. Keep replies under
{maxReplyLength} characters.',
    "auto_reply_enabled" BOOLEAN NOT NULL DEFAULT true,
    "language" TEXT NOT NULL DEFAULT 'en',
    "business_name" TEXT,
    "business_context" TEXT,
    "fallback_message" TEXT,
    "max_reply_length" INTEGER NOT NULL DEFAULT 300,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_events" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "stripe_event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "plan_tier" "PlanTier" NOT NULL,
    "status" TEXT NOT NULL,
    "amount" INTEGER,
    "currency" TEXT,
    "period_start" TIMESTAMP(3),
    "period_end" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_customer_id_key" ON "users"("stripe_customer_id");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE INDEX "users_plan_tier_idx" ON "users"("plan_tier");

-- CreateIndex
CREATE INDEX "users_subscription_status_idx" ON "users"("subscription_status");

-- CreateIndex
CREATE INDEX "whatsapp_connections_user_id_idx" ON "whatsapp_connections"("user_id");

-- CreateIndex
CREATE INDEX "whatsapp_connections_created_at_idx" ON "whatsapp_connections"("created_at");

-- CreateIndex
CREATE INDEX "whatsapp_connections_is_active_idx" ON "whatsapp_connections"("is_active");

-- CreateIndex
CREATE INDEX "whatsapp_connections_is_verified_idx" ON "whatsapp_connections"("is_verified");

-- CreateIndex
CREATE UNIQUE INDEX "messages_wa_message_id_key" ON "messages"("wa_message_id");

-- CreateIndex
CREATE INDEX "messages_user_id_created_at_idx" ON "messages"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_user_id_status_idx" ON "messages"("user_id", "status");

-- CreateIndex
CREATE INDEX "messages_connection_id_idx" ON "messages"("connection_id");

-- CreateIndex
CREATE INDEX "messages_created_at_idx" ON "messages"("created_at");

-- CreateIndex
CREATE INDEX "messages_status_idx" ON "messages"("status");

-- CreateIndex
CREATE INDEX "messages_wa_message_id_idx" ON "messages"("wa_message_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_user_id_key" ON "user_settings"("user_id");

-- CreateIndex
CREATE INDEX "user_settings_created_at_idx" ON "user_settings"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_events_stripe_event_id_key" ON "subscription_events"("stripe_event_id");

-- CreateIndex
CREATE INDEX "subscription_events_user_id_idx" ON "subscription_events"("user_id");

-- CreateIndex
CREATE INDEX "subscription_events_created_at_idx" ON "subscription_events"("created_at");

-- CreateIndex
CREATE INDEX "subscription_events_event_type_idx" ON "subscription_events"("event_type");

-- CreateIndex
CREATE INDEX "subscription_events_plan_tier_idx" ON "subscription_events"("plan_tier");

-- CreateIndex
CREATE INDEX "subscription_events_status_idx" ON "subscription_events"("status");

-- AddForeignKey
ALTER TABLE "whatsapp_connections" ADD CONSTRAINT "whatsapp_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "whatsapp_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- [ROLE: BACKEND ENGINEER]
-- Decision: Supabase RLS is enabled as defense in depth. The app writes through
-- server-side Prisma, while direct Supabase Data API access is limited to own-row reads.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "whatsapp_connections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscription_events" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own" ON "users"
    FOR SELECT
    TO authenticated
    USING ((select auth.uid()) = "id");

CREATE POLICY "whatsapp_connections_select_own" ON "whatsapp_connections"
    FOR SELECT
    TO authenticated
    USING ((select auth.uid()) = "user_id");

CREATE POLICY "messages_select_own" ON "messages"
    FOR SELECT
    TO authenticated
    USING ((select auth.uid()) = "user_id");

CREATE POLICY "user_settings_select_own" ON "user_settings"
    FOR SELECT
    TO authenticated
    USING ((select auth.uid()) = "user_id");

CREATE POLICY "subscription_events_select_own" ON "subscription_events"
    FOR SELECT
    TO authenticated
    USING ((select auth.uid()) = "user_id");
