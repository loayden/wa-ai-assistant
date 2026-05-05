// FILE: src/lib/stripe/client.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Subscription billing should use Stripe Checkout and Customer Portal
 * so renewal, payment retries, and customer payment-method management remain
 * owned by Stripe Billing.
 */
import "server-only";

import Stripe from "stripe";

import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";

export const stripe = new Stripe(appEnv.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
});

export async function createCheckoutSession(userId: string, email: string, priceId = appEnv.STRIPE_PRO_PRICE_ID) {
  try {
    return await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${appEnv.NEXT_PUBLIC_APP_URL}/billing?checkout=success`,
      cancel_url: `${appEnv.NEXT_PUBLIC_APP_URL}/billing?checkout=cancelled`,
      metadata: {
        userId,
      },
      subscription_data: {
        metadata: {
          userId,
        },
      },
    });
  } catch (error) {
    logger.error("stripe.createCheckoutSession", "Failed to create Stripe Checkout session.", { error, userId });
    throw error;
  }
}

export async function createPortalSession(customerId: string) {
  try {
    return await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appEnv.NEXT_PUBLIC_APP_URL}/billing`,
    });
  } catch (error) {
    logger.error("stripe.createPortalSession", "Failed to create Stripe portal session.", { error, customerId });
    throw error;
  }
}

export function constructWebhookEvent(payload: string | Buffer, signature: string): Stripe.Event {
  try {
    return stripe.webhooks.constructEvent(payload, signature, appEnv.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    logger.warn("stripe.constructWebhookEvent", "Invalid Stripe webhook signature.", { error });
    throw error;
  }
}
