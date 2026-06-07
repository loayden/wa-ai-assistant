-- CreateEnum
CREATE TYPE "OutboundMessageStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED', 'RETRYING', 'BLOCKED');

-- CreateTable
CREATE TABLE "outbound_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "connection_id" UUID NOT NULL,
    "related_message_id" UUID,
    "idempotency_key" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "body_text" TEXT NOT NULL,
    "external_thread_id" TEXT,
    "status" "OutboundMessageStatus" NOT NULL DEFAULT 'PENDING',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "next_attempt_at" TIMESTAMP(3),
    "last_attempt_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),
    "provider_message_id" TEXT,
    "failure_code" TEXT,
    "failure_reason" TEXT,
    "failure_action_href" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}'::JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbound_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "outbound_messages_idempotency_key_key" ON "outbound_messages"("idempotency_key");

-- CreateIndex
CREATE INDEX "outbound_messages_status_next_attempt_at_idx" ON "outbound_messages"("status", "next_attempt_at");

-- CreateIndex
CREATE INDEX "outbound_messages_user_id_status_idx" ON "outbound_messages"("user_id", "status");

-- CreateIndex
CREATE INDEX "outbound_messages_connection_id_recipient_id_idx" ON "outbound_messages"("connection_id", "recipient_id");

-- CreateIndex
CREATE INDEX "outbound_messages_related_message_id_idx" ON "outbound_messages"("related_message_id");

-- CreateIndex
CREATE INDEX "outbound_messages_created_at_idx" ON "outbound_messages"("created_at");

-- AddForeignKey
ALTER TABLE "outbound_messages" ADD CONSTRAINT "outbound_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbound_messages" ADD CONSTRAINT "outbound_messages_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "whatsapp_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbound_messages" ADD CONSTRAINT "outbound_messages_related_message_id_fkey" FOREIGN KEY ("related_message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- [ROLE: SECURITY ENGINEER]
-- Decision: outbound_messages is tenant-owned operational data. Authenticated
-- users may read only their own rows; writes remain server-side only.
ALTER TABLE "outbound_messages" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "outbound_messages_select_own" ON "outbound_messages"
    FOR SELECT
    TO authenticated
    USING (NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid = "user_id");
