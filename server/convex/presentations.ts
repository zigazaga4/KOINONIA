import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List presentations for a device, newest first
export const list = query({
  args: { deviceId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("presentations")
      .withIndex("by_device", (q) => q.eq("deviceId", args.deviceId))
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
    deviceId: v.string(),
    title: v.string(),
    mode: v.optional(v.string()),
    html: v.optional(v.string()),
    themeCss: v.optional(v.string()),
    slides: v.optional(v.array(v.object({ title: v.string(), html: v.string() }))),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("presentations", {
      deviceId: args.deviceId,
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

// Delete a presentation
export const remove = mutation({
  args: { presentationId: v.id("presentations") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.presentationId);
  },
});
