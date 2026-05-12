-- FILE: prisma/migrations/20260506095357_add_owner_phone_number/migration.sql
-- [ROLE: BACKEND ENGINEER]
-- Decision: Owner commands need a nullable phone-number marker on each
-- WhatsApp connection without disturbing existing tenant connections.
ALTER TABLE "whatsapp_connections" ADD COLUMN "owner_phone_number" TEXT;
