import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listByChapter = query({
  args: {
    bookId: v.number(),
    chapter: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("highlights")
      .withIndex("by_user_chapter", (q) =>
        q.eq("userId", userId).eq("bookId", args.bookId).eq("chapter", args.chapter)
      )
      .collect();
  },
});

export const create = mutation({
  args: {
    bookId: v.number(),
    chapter: v.number(),
    verse: v.number(),
    startWord: v.number(),
    endWord: v.number(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("highlights", {
      userId,
      bookId: args.bookId,
      chapter: args.chapter,
      verse: args.verse,
      startWord: args.startWord,
      endWord: args.endWord,
      color: args.color,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { highlightId: v.id("highlights") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const highlight = await ctx.db.get(args.highlightId);
    if (!highlight || highlight.userId !== userId) {
      throw new Error("Not found");
    }
    await ctx.db.delete(args.highlightId);
  },
});
