import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("STRIPE_SECRET_KEY not set — Stripe features will be unavailable");
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : (null as unknown as Stripe);

// Map Stripe price IDs → tier names
export const PRICE_TO_TIER: Record<string, string> = {};
export const TIER_TO_PRICE: Record<string, string> = {};

const priceMap: Record<string, string> = {
  STRIPE_PRICE_STUDENT: "student",
  STRIPE_PRICE_BELIEVER: "believer",
  STRIPE_PRICE_MINISTRY: "ministry",
  STRIPE_PRICE_SEMINARY: "seminary",
};

for (const [envKey, tier] of Object.entries(priceMap)) {
  const priceId = process.env[envKey];
  if (priceId) {
    PRICE_TO_TIER[priceId] = tier;
    TIER_TO_PRICE[tier] = priceId;
  }
}
