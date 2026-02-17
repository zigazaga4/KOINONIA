import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// List presentations for the authenticated user, newest first
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("presentations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
  },
});

// Get a single presentation
export const get = query({
  args: { presentationId: v.id("presentations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.presentationId);
  },
});

// Save a new presentation
export const save = mutation({
  args: {
    title: v.string(),
    mode: v.optional(v.string()),
    html: v.optional(v.string()),
    themeCss: v.optional(v.string()),
    slides: v.optional(v.array(v.object({ title: v.string(), html: v.string() }))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const now = Date.now();
    return await ctx.db.insert("presentations", {
      userId,
      title: args.title || "Untitled Presentation",
      mode: args.mode || "document",
      html: args.html,
      themeCss: args.themeCss,
      slides: args.slides,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update an existing presentation
export const update = mutation({
  args: {
    presentationId: v.id("presentations"),
    title: v.optional(v.string()),
    mode: v.optional(v.string()),
    html: v.optional(v.string()),
    themeCss: v.optional(v.string()),
    slides: v.optional(v.array(v.object({ title: v.string(), html: v.string() }))),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.title !== undefined) patch.title = args.title;
    if (args.mode !== undefined) patch.mode = args.mode;
    if (args.html !== undefined) patch.html = args.html;
    if (args.themeCss !== undefined) patch.themeCss = args.themeCss;
    if (args.slides !== undefined) patch.slides = args.slides;
    await ctx.db.patch(args.presentationId, patch);
  },
});

// One-time migration: claim all orphaned (deviceId-only) presentations for the current user
export const claimOrphaned = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const all = await ctx.db.query("presentations").collect();
    let claimed = 0;
    for (const p of all) {
      if (!p.userId) {
        await ctx.db.patch(p._id, { userId });
        claimed++;
      }
    }
    return claimed;
  },
});

// CLI migration: assign all orphaned records to the given userId
export const migrateOrphaned = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("presentations").collect();
    let claimed = 0;
    for (const p of all) {
      if (!p.userId) {
        await ctx.db.patch(p._id, { userId: args.userId });
        claimed++;
      }
    }
    return claimed;
  },
});

// Delete a presentation
export const remove = mutation({
  args: { presentationId: v.id("presentations") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.presentationId);
  },
});
