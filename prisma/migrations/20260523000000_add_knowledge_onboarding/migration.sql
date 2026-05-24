-- FILE: prisma/migrations/20260523000000_add_knowledge_onboarding/migration.sql
-- [ROLE: BACKEND ENGINEER]
-- Decision: Add tenant-owned knowledge entries and a small onboarding flag
-- without reshaping the existing users / WhatsApp connection schema.

ALTER TABLE "users" ADD COLUMN "onboarding_completed" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "knowledge_base" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_base_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "knowledge_base_type_check" CHECK ("type" IN ('text', 'faq', 'hours'))
);

CREATE INDEX "knowledge_base_user_id_idx" ON "knowledge_base"("user_id");
CREATE INDEX "knowledge_base_user_id_type_idx" ON "knowledge_base"("user_id", "type");

ALTER TABLE "knowledge_base" ADD CONSTRAINT "knowledge_base_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "knowledge_base" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "knowledge_base_manage_own" ON "knowledge_base"
    FOR ALL
    TO authenticated
    USING ((select auth.uid()) = "user_id")
    WITH CHECK ((select auth.uid()) = "user_id");
