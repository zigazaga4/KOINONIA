import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

// Get all posts (newest first) - real-time by default
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("posts")
      .order("desc")
      .take(50);
  },
});

// Create a new post (requires auth)
export const create = mutation({
  args: {
    content: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("posts", {
      authorId: userId,
      content: args.content,
      imageUrl: args.imageUrl,
      likes: 0,
      createdAt: Date.now(),
    });
  },
});

// Like a post
export const like = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");
    await ctx.db.patch(args.postId, { likes: post.likes + 1 });
  },
});
