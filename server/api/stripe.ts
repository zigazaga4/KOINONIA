import { Hono } from "hono";
import { stripe, PRICE_TO_TIER, TIER_TO_PRICE } from "../lib/stripe.js";
import { authMiddleware } from "../lib/authMiddleware.js";
import { convexClient } from "../lib/convex.js";
import { api } from "../convex/_generated/api.js";
import { logger } from "../lib/logger.js";
import type Stripe from "stripe";

const INTERNAL_SECRET = process.env.INTERNAL_SECRET || "";
const APP_URL = process.env.APP_URL || "https://koinonia.app";

const stripeRouter = new Hono();

// ─── POST /checkout — Create a Stripe Checkout session ──────────────────────

stripeRouter.post("/checkout", authMiddleware, async (c) => {
  const userId = c.get("userId") as string | null;
  if (!userId) {
    return c.json({ error: "Authentication required (JWT needed)" }, 401);
  }
  if (!stripe) {
    return c.json({ error: "Stripe not configured" }, 503);
  }

  const { tier } = await c.req.json<{ tier: string }>();
  const priceId = TIER_TO_PRICE[tier];
  if (!priceId) {
    return c.json({ error: `Invalid tier: ${tier}` }, 400);
  }

  // Look up existing Stripe customer for this user
  const existingSub = await convexClient.query(
    api.subscriptions.getSubscriptionByUserId,
    { userId }
  );

  let customerId = existingSub?.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { convexUserId: userId },
    });
    customerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${APP_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}/subscription/cancel`,
    metadata: { convexUserId: userId, tier },
    subscription_data: {
      metadata: { convexUserId: userId, tier },
    },
  });

  return c.json({ url: session.url, sessionId: session.id });
});

// ─── POST /portal — Create a Stripe Customer Portal session ─────────────────

stripeRouter.post("/portal", authMiddleware, async (c) => {
  const userId = c.get("userId") as string | null;
  if (!userId) {
    return c.json({ error: "Authentication required (JWT needed)" }, 401);
  }
  if (!stripe) {
    return c.json({ error: "Stripe not configured" }, 503);
  }

  const existingSub = await convexClient.query(
    api.subscriptions.getSubscriptionByUserId,
    { userId }
  );

  if (!existingSub?.stripeCustomerId) {
    return c.json({ error: "No subscription found" }, 404);
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: existingSub.stripeCustomerId,
    return_url: `${APP_URL}/settings`,
  });

  return c.json({ url: session.url });
});

// ─── POST /webhook — Handle Stripe webhook events ───────────────────────────

function mapStripeStatus(
  status: string
): "active" | "canceled" | "past_due" | "unpaid" | "trialing" {
  switch (status) {
    case "active": return "active";
    case "canceled": return "canceled";
    case "past_due": return "past_due";
    case "unpaid": return "unpaid";
    case "trialing": return "trialing";
    default: return "canceled";
  }
}

stripeRouter.post("/webhook", async (c) => {
  if (!stripe) {
    return c.json({ error: "Stripe not configured" }, 503);
  }

  const rawBody = await c.req.text();
  const signature = c.req.header("stripe-signature");

  if (!signature) {
    return c.json({ error: "Missing stripe-signature header" }, 400);
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    logger.error(`Webhook signature verification failed: ${err}`);
    return c.json({ error: "Invalid signature" }, 400);
  }

  logger.info(`Stripe webhook: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription && session.metadata?.convexUserId) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          const priceId = subscription.items.data[0]?.price.id;
          const tier = PRICE_TO_TIER[priceId] || "student";

          await convexClient.mutation(api.subscriptions.upsertSubscription, {
            serverSecret: INTERNAL_SECRET,
            userId: session.metadata.convexUserId,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subscription.id,
            stripePriceId: priceId,
            tier: tier as any,
            status: mapStripeStatus(subscription.status),
            currentPeriodStart: subscription.current_period_start * 1000,
            currentPeriodEnd: subscription.current_period_end * 1000,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const convexUserId = subscription.metadata?.convexUserId;
        if (!convexUserId) break;

        const priceId = subscription.items.data[0]?.price.id;
        const tier = PRICE_TO_TIER[priceId] || "student";

        await convexClient.mutation(api.subscriptions.upsertSubscription, {
          serverSecret: INTERNAL_SECRET,
          userId: convexUserId,
          stripeCustomerId: subscription.customer as string,
          stripeSubscriptionId: subscription.id,
          stripePriceId: priceId,
          tier: tier as any,
          status: mapStripeStatus(subscription.status),
          currentPeriodStart: subscription.current_period_start * 1000,
          currentPeriodEnd: subscription.current_period_end * 1000,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await convexClient.mutation(api.subscriptions.cancelSubscription, {
          serverSecret: INTERNAL_SECRET,
          stripeSubscriptionId: subscription.id,
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          );
          const convexUserId = subscription.metadata?.convexUserId;
          if (convexUserId) {
            const priceId = subscription.items.data[0]?.price.id;
            await convexClient.mutation(api.subscriptions.upsertSubscription, {
              serverSecret: INTERNAL_SECRET,
              userId: convexUserId,
              stripeCustomerId: subscription.customer as string,
              stripeSubscriptionId: subscription.id,
              stripePriceId: priceId,
              tier: (PRICE_TO_TIER[priceId] || "student") as any,
              status: "past_due",
              currentPeriodStart: subscription.current_period_start * 1000,
              currentPeriodEnd: subscription.current_period_end * 1000,
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
            });
          }
        }
        break;
      }
    }
  } catch (err) {
    logger.error(`Error processing webhook ${event.type}: ${err}`);
    // Return 200 anyway to avoid Stripe retries on our logic errors
  }

  return c.json({ received: true });
});

export default stripeRouter;
