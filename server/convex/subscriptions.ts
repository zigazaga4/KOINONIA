import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const INTERNAL_SECRET = process.env.INTERNAL_SECRET;

const TIER_CONFIG: Record<string, { messageLimit: number }> = {
  free:     { messageLimit: 30 },
  student:  { messageLimit: 200 },
  believer: { messageLimit: 300 },
  ministry: { messageLimit: 800 },
  seminary: { messageLimit: 2000 },
};

function getMonthBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
  return { start, end };
}

// ─── Frontend-facing queries ────────────────────────────────────────────────

/** Get the current user's subscription + usage summary */
export const getMySubscription = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    const tier = sub?.tier ?? "free";
    const config = TIER_CONFIG[tier] ?? TIER_CONFIG.free;

    // Determine current period
    let periodStart: number;
    let periodEnd: number;
    if (sub && sub.status !== "canceled") {
      periodStart = sub.currentPeriodStart;
      periodEnd = sub.currentPeriodEnd;
    } else {
      const bounds = getMonthBounds();
      periodStart = bounds.start;
      periodEnd = bounds.end;
    }

    // Get usage for current period
    const usage = await ctx.db
      .query("usage")
      .withIndex("by_userId_period", (q) =>
        q.eq("userId", userId).eq("periodStart", periodStart)
      )
      .first();

    return {
      tier,
      status: sub?.status ?? "none" as const,
      messageCount: usage?.messageCount ?? 0,
      messageLimit: config.messageLimit,
      periodEnd,
      cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
    };
  },
});

// ─── Server-facing queries (called from Hono via ConvexHttpClient) ──────────

/** Look up subscription by Convex userId string */
export const getSubscriptionByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // userId comes as a string from the JWT — cast to Id
    const userId = args.userId as any;
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
  },
});

/** Look up usage for a user in a specific period */
export const getUsageForUser = query({
  args: { userId: v.string(), periodStart: v.number() },
  handler: async (ctx, args) => {
    const userId = args.userId as any;
    return await ctx.db
      .query("usage")
      .withIndex("by_userId_period", (q) =>
        q.eq("userId", userId).eq("periodStart", args.periodStart)
      )
      .first();
  },
});

// ─── Internal query for JWT creation ────────────────────────────────────────

/** Resolve the current authenticated user's ID (for embedding in JWT) */
export const resolveUserId = internalQuery({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return userId;
  },
});

// ─── Server-facing mutations (protected by INTERNAL_SECRET) ─────────────────

function validateSecret(secret: string) {
  if (!INTERNAL_SECRET) throw new Error("INTERNAL_SECRET not configured");
  if (secret !== INTERNAL_SECRET) throw new Error("Forbidden");
}

/** Create or update a subscription record from Stripe webhook data */
export const upsertSubscription = mutation({
  args: {
    serverSecret: v.string(),
    userId: v.string(),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    stripePriceId: v.string(),
    tier: v.union(
      v.literal("free"),
      v.literal("student"),
      v.literal("believer"),
      v.literal("ministry"),
      v.literal("seminary")
    ),
    status: v.union(
      v.literal("active"),
      v.literal("canceled"),
      v.literal("past_due"),
      v.literal("unpaid"),
      v.literal("trialing")
    ),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
  },
  handler: async (ctx, args) => {
    validateSecret(args.serverSecret);
    const now = Date.now();
    const userId = args.userId as any;

    // Check if subscription already exists for this Stripe subscription
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripeSubscriptionId", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        tier: args.tier,
        status: args.status,
        stripePriceId: args.stripePriceId,
        currentPeriodStart: args.currentPeriodStart,
        currentPeriodEnd: args.currentPeriodEnd,
        cancelAtPeriodEnd: args.cancelAtPeriodEnd,
        updatedAt: now,
      });
      return existing._id;
    }

    // Also check by userId — user might be changing plans
    const byUser = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (byUser) {
      await ctx.db.patch(byUser._id, {
        stripeCustomerId: args.stripeCustomerId,
        stripeSubscriptionId: args.stripeSubscriptionId,
        stripePriceId: args.stripePriceId,
        tier: args.tier,
        status: args.status,
        currentPeriodStart: args.currentPeriodStart,
        currentPeriodEnd: args.currentPeriodEnd,
        cancelAtPeriodEnd: args.cancelAtPeriodEnd,
        updatedAt: now,
      });
      return byUser._id;
    }

    return await ctx.db.insert("subscriptions", {
      userId,
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      stripePriceId: args.stripePriceId,
      tier: args.tier,
      status: args.status,
      currentPeriodStart: args.currentPeriodStart,
      currentPeriodEnd: args.currentPeriodEnd,
      cancelAtPeriodEnd: args.cancelAtPeriodEnd,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Mark a subscription as canceled */
export const cancelSubscription = mutation({
  args: {
    serverSecret: v.string(),
    stripeSubscriptionId: v.string(),
  },
  handler: async (ctx, args) => {
    validateSecret(args.serverSecret);

    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripeSubscriptionId", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId)
      )
      .first();

    if (sub) {
      await ctx.db.patch(sub._id, {
        status: "canceled",
        updatedAt: Date.now(),
      });
    }
  },
});

/** Increment usage counter for the current billing period (upsert) */
export const incrementUsage = mutation({
  args: {
    serverSecret: v.string(),
    userId: v.string(),
    periodStart: v.number(),
    periodEnd: v.number(),
  },
  handler: async (ctx, args) => {
    validateSecret(args.serverSecret);
    const now = Date.now();
    const userId = args.userId as any;

    const existing = await ctx.db
      .query("usage")
      .withIndex("by_userId_period", (q) =>
        q.eq("userId", userId).eq("periodStart", args.periodStart)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        messageCount: existing.messageCount + 1,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("usage", {
        userId,
        periodStart: args.periodStart,
        periodEnd: args.periodEnd,
        messageCount: 1,
        updatedAt: now,
      });
    }
  },
});
