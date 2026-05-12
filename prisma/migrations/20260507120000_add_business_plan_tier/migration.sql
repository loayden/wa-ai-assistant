-- FILE: prisma/migrations/20260507120000_add_business_plan_tier/migration.sql
-- [ROLE: BACKEND ENGINEER]
-- Decision: The product now supports a BUSINESS subscription tier, so the
-- database enum must include it before Stripe webhooks or app updates persist
-- BUSINESS plan state.
ALTER TYPE "PlanTier" ADD VALUE IF NOT EXISTS 'BUSINESS';
