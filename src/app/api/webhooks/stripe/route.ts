// FILE: src/app/api/webhooks/stripe/route.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Stripe webhooks are trusted only after signature verification, then
 * persisted as audit events while updating local subscription state.
 */
import { PlanTier, SubscriptionStatus, type User } from "@prisma/client";
import Stripe from "stripe";

import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess } from "@/lib/api/response";
import { prisma } from "@/lib/prisma/client";
import { sendEmail } from "@/lib/resend/client";
import { constructWebhookEvent } from "@/lib/stripe/client";
import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getStripeId(value: string | { id: string } | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return typeof value === "string" ? value : value.id;
}

function toDateFromUnix(value: number | null | undefined): Date | undefined {
  return typeof value === "number" ? new Date(value * 1000) : undefined;
}

function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":
    case "trialing":
      return SubscriptionStatus.ACTIVE;
    case "past_due":
    case "unpaid":
      return SubscriptionStatus.PAST_DUE;
    case "canceled":
    case "incomplete_expired":
      return SubscriptionStatus.CANCELED;
    default:
      return SubscriptionStatus.INACTIVE;
  }
}

function parsePlanTier(value: string | null | undefined): PlanTier | null {
  if (value === PlanTier.FREE || value === PlanTier.PRO || value === PlanTier.BUSINESS) {
    return value;
  }

  return null;
}

function mapPlanTierFromPriceId(priceId: string | null | undefined): PlanTier | null {
  if (!priceId) {
    return null;
  }

  if (priceId === appEnv.STRIPE_PRO_PRICE_ID) {
    return PlanTier.PRO;
  }

  if (priceId === appEnv.STRIPE_BUSINESS_PRICE_ID) {
    return PlanTier.BUSINESS;
  }

  return null;
}

function resolvePaidPlanTier(params: {
  fallbackTier: PlanTier;
  metadataPlanTier?: string | null;
  priceId?: string | null;
  subscriptionStatus: Stripe.Subscription.Status;
}): PlanTier {
  if (!["active", "trialing", "past_due"].includes(params.subscriptionStatus)) {
    return PlanTier.FREE;
  }

  const metadataTier = parsePlanTier(params.metadataPlanTier);

  if (metadataTier && metadataTier !== PlanTier.FREE) {
    return metadataTier;
  }

  const priceTier = mapPlanTierFromPriceId(params.priceId);

  if (priceTier && priceTier !== PlanTier.FREE) {
    return priceTier;
  }

  return params.fallbackTier === PlanTier.FREE ? PlanTier.PRO : params.fallbackTier;
}

async function findUserForStripeObject(params: {
  customerId?: string | null;
  subscriptionId?: string | null;
}): Promise<User | null> {
  if (params.subscriptionId) {
    const user = await prisma.user.findFirst({
      where: { stripeSubscriptionId: params.subscriptionId },
    });

    if (user) {
      return user;
    }
  }

  if (params.customerId) {
    return prisma.user.findFirst({
      where: { stripeCustomerId: params.customerId },
    });
  }

  return null;
}

async function saveSubscriptionEvent(params: {
  event: Stripe.Event;
  userId: string;
  planTier: PlanTier;
  status: string;
  amount?: number | null;
  currency?: string | null;
  periodStart?: Date;
  periodEnd?: Date;
}) {
  return prisma.subscriptionEvent.upsert({
    where: { stripeEventId: params.event.id },
    update: {
      status: params.status,
    },
    create: {
      userId: params.userId,
      stripeEventId: params.event.id,
      eventType: params.event.type,
      planTier: params.planTier,
      status: params.status,
      amount: params.amount,
      currency: params.currency,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
    },
  });
}

async function handleCheckoutCompleted(event: Stripe.Event, session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const planTier = resolvePaidPlanTier({
    fallbackTier: PlanTier.PRO,
    metadataPlanTier: session.metadata?.planTier,
    subscriptionStatus: "active",
  });
  const customerId = getStripeId(session.customer);
  const subscriptionId = getStripeId(session.subscription);

  if (!userId || !customerId) {
    logger.warn("api.webhooks.stripe", "Checkout session missing required user/customer metadata.", {
      eventId: event.id,
      customerId,
      subscriptionId,
    });
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      planTier,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
    },
  });

  await saveSubscriptionEvent({
    event,
    userId,
    planTier,
    status: SubscriptionStatus.ACTIVE,
    amount: session.amount_total,
    currency: session.currency,
  });
}

async function handleSubscriptionUpdated(event: Stripe.Event, subscription: Stripe.Subscription) {
  const customerId = getStripeId(subscription.customer);
  const user = await findUserForStripeObject({
    customerId,
    subscriptionId: subscription.id,
  });

  if (!user) {
    logger.warn("api.webhooks.stripe", "Subscription update did not match a local user.", {
      eventId: event.id,
      subscriptionId: subscription.id,
      customerId,
    });
    return;
  }

  const subscriptionStatus = mapStripeSubscriptionStatus(subscription.status);
  const priceId = subscription.items.data[0]?.price?.id;
  const planTier = resolvePaidPlanTier({
    fallbackTier: user.planTier,
    metadataPlanTier: subscription.metadata?.planTier,
    priceId,
    subscriptionStatus: subscription.status,
  });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      planTier,
      subscriptionStatus,
      stripeCustomerId: customerId ?? user.stripeCustomerId,
      stripeSubscriptionId: subscription.id,
    },
  });

  await saveSubscriptionEvent({
    event,
    userId: user.id,
    planTier,
    status: subscriptionStatus,
    currency: subscription.currency,
    periodStart: toDateFromUnix(subscription.current_period_start),
    periodEnd: toDateFromUnix(subscription.current_period_end),
  });
}

async function handleSubscriptionDeleted(event: Stripe.Event, subscription: Stripe.Subscription) {
  const customerId = getStripeId(subscription.customer);
  const user = await findUserForStripeObject({
    customerId,
    subscriptionId: subscription.id,
  });

  if (!user) {
    logger.warn("api.webhooks.stripe", "Subscription deletion did not match a local user.", {
      eventId: event.id,
      subscriptionId: subscription.id,
      customerId,
    });
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      planTier: PlanTier.FREE,
      subscriptionStatus: SubscriptionStatus.CANCELED,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customerId ?? user.stripeCustomerId,
    },
  });

  await saveSubscriptionEvent({
    event,
    userId: user.id,
    planTier: PlanTier.FREE,
    status: SubscriptionStatus.CANCELED,
    currency: subscription.currency,
    periodStart: toDateFromUnix(subscription.current_period_start),
    periodEnd: toDateFromUnix(subscription.current_period_end),
  });
}

async function handleInvoicePaymentFailed(event: Stripe.Event, invoice: Stripe.Invoice) {
  const customerId = getStripeId(invoice.customer);
  const subscriptionId = getStripeId(invoice.subscription);
  const user = await findUserForStripeObject({
    customerId,
    subscriptionId,
  });

  if (!user) {
    logger.warn("api.webhooks.stripe", "Failed invoice did not match a local user.", {
      eventId: event.id,
      invoiceId: invoice.id,
      customerId,
      subscriptionId,
    });
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: SubscriptionStatus.PAST_DUE,
      stripeCustomerId: customerId ?? user.stripeCustomerId,
      stripeSubscriptionId: subscriptionId ?? user.stripeSubscriptionId,
    },
  });

  await saveSubscriptionEvent({
    event,
    userId: user.id,
    planTier: user.planTier,
    status: SubscriptionStatus.PAST_DUE,
    amount: invoice.amount_due,
    currency: invoice.currency,
    periodStart: toDateFromUnix(invoice.period_start),
    periodEnd: toDateFromUnix(invoice.period_end),
  });

  try {
    await sendEmail({
      to: user.email,
      subject: "Payment failed for kallem",
      html: "<p>Your latest kallem subscription payment failed. Please update your payment method to keep your paid features active.</p>",
      text: "Your latest kallem subscription payment failed. Please update your payment method to keep your paid features active.",
    });
  } catch (error) {
    logger.error("api.webhooks.stripe", "Failed to send invoice payment failure email.", { error, userId: user.id });
  }
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return jsonError("Missing Stripe signature.", 400);
  }

  const payload = await request.text();
  let event: Stripe.Event;

  try {
    event = constructWebhookEvent(payload, signature);
  } catch {
    return jsonError("Invalid Stripe webhook signature.", 400);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event, event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event, event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event, event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event, event.data.object as Stripe.Invoice);
        break;
      default:
        logger.info("api.webhooks.stripe", "Ignored unsupported Stripe event type.", {
          eventId: event.id,
          eventType: event.type,
        });
        break;
    }

    return jsonSuccess({ received: true });
  } catch (error) {
    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.webhooks.stripe", error);

    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }

    logger.error("api.webhooks.stripe", "Stripe webhook processing failed.", { error, eventId: event.id });
    return jsonError("Stripe webhook processing failed.", 500);
  }
}
