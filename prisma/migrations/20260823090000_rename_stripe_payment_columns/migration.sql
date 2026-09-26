-- Align the existing production Stripe-era column names with the provider-neutral
-- payment_* names used by Prisma. The guards make this safe for databases that
-- already have the renamed columns.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'stripe_customer_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'payment_customer_id'
  ) THEN
    ALTER TABLE "users" RENAME COLUMN "stripe_customer_id" TO "payment_customer_id";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'stripe_subscription_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'payment_subscription_id'
  ) THEN
    ALTER TABLE "users" RENAME COLUMN "stripe_subscription_id" TO "payment_subscription_id";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscription_events' AND column_name = 'stripe_event_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscription_events' AND column_name = 'payment_event_id'
  ) THEN
    ALTER TABLE "subscription_events" RENAME COLUMN "stripe_event_id" TO "payment_event_id";
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.users_stripe_customer_id_key') IS NOT NULL
     AND to_regclass('public.users_payment_customer_id_key') IS NULL THEN
    ALTER INDEX "users_stripe_customer_id_key" RENAME TO "users_payment_customer_id_key";
  END IF;

  IF to_regclass('public.subscription_events_stripe_event_id_key') IS NOT NULL
     AND to_regclass('public.subscription_events_payment_event_id_key') IS NULL THEN
    ALTER INDEX "subscription_events_stripe_event_id_key" RENAME TO "subscription_events_payment_event_id_key";
  END IF;
END $$;
