import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

// Get messages for a group (real-time)
export const list = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .order("asc")
      .take(100);
  },
});

// Send a message (requires auth)
export const send = mutation({
  args: {
    groupId: v.id("groups"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("messages", {
      groupId: args.groupId,
      authorId: userId,
      content: args.content,
      createdAt: Date.now(),
    });
  },
});
