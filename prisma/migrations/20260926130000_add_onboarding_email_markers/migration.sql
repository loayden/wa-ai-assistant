-- AlterTable
ALTER TABLE "users" ADD COLUMN "welcome_email_sent_at" TIMESTAMP(3),
ADD COLUMN "onboarding_nudge_sent_at" TIMESTAMP(3),
ADD COLUMN "week_one_summary_sent_at" TIMESTAMP(3);
