import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// List conversations for the authenticated user, newest first
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
  },
});

// Create a new conversation
export const create = mutation({
  args: {
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const now = Date.now();
    return await ctx.db.insert("conversations", {
      userId,
      title: args.title,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Get a conversation's messages
export const getMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("aiMessages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("asc")
      .collect();
  },
});

// Save a message to a conversation
export const saveMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    thinking: v.optional(v.string()),
    toolCalls: v.optional(
      v.array(
        v.object({
          name: v.string(),
          args: v.any(),
          result: v.optional(v.any()),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const messageId = await ctx.db.insert("aiMessages", {
      conversationId: args.conversationId,
      role: args.role,
      content: args.content,
      thinking: args.thinking,
      toolCalls: args.toolCalls,
      createdAt: now,
    });

    // Update conversation timestamp
    await ctx.db.patch(args.conversationId, { updatedAt: now });

    return messageId;
  },
});

// Update conversation title
export const updateTitle = mutation({
  args: {
    conversationId: v.id("conversations"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, { title: args.title });
  },
});

// One-time migration: claim all orphaned (deviceId-only) conversations for the current user
export const claimOrphaned = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const all = await ctx.db.query("conversations").collect();
    let claimed = 0;
    for (const c of all) {
      if (!c.userId) {
        await ctx.db.patch(c._id, { userId });
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
    const all = await ctx.db.query("conversations").collect();
    let claimed = 0;
    for (const c of all) {
      if (!c.userId) {
        await ctx.db.patch(c._id, { userId: args.userId });
        claimed++;
      }
    }
    return claimed;
  },
});

// Delete a conversation and all its messages
export const remove = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    // Delete all messages first
    const messages = await ctx.db
      .query("aiMessages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    // Delete conversation
    await ctx.db.delete(args.conversationId);
  },
});
