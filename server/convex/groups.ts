import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

// List all public groups
export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("groups")
      .filter((q) => q.eq(q.field("isPublic"), true))
      .order("desc")
      .take(50);
  },
});

// Create a new Bible study group (requires auth)
export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    isPublic: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const groupId = await ctx.db.insert("groups", {
      name: args.name,
      description: args.description,
      creatorId: userId,
      isPublic: args.isPublic,
      createdAt: Date.now(),
    });

    // Auto-add creator as admin
    await ctx.db.insert("groupMembers", {
      groupId,
      userId,
      role: "admin",
      joinedAt: Date.now(),
    });

    return groupId;
  },
});

// Join a group (requires auth)
export const join = mutation({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("groupMembers", {
      groupId: args.groupId,
      userId,
      role: "member",
      joinedAt: Date.now(),
    });
  },
});
