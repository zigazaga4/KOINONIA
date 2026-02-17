import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// All user notes, newest first (for Notes tab)
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("notes")
      .withIndex("by_user_all", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

// Notes for a specific chapter (for verse indicators)
export const listByChapter = query({
  args: {
    bookId: v.number(),
    chapter: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("notes")
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
    content: v.string(),
    color: v.string(),
    verseText: v.string(),
    bookName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const now = Date.now();
    return await ctx.db.insert("notes", {
      userId,
      bookId: args.bookId,
      chapter: args.chapter,
      verse: args.verse,
      content: args.content,
      color: args.color,
      verseText: args.verseText,
      bookName: args.bookName,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    noteId: v.id("notes"),
    content: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== userId) {
      throw new Error("Not found");
    }
    const patch: Record<string, any> = { updatedAt: Date.now() };
    if (args.content !== undefined) patch.content = args.content;
    if (args.color !== undefined) patch.color = args.color;
    await ctx.db.patch(args.noteId, patch);
  },
});

export const remove = mutation({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== userId) {
      throw new Error("Not found");
    }
    await ctx.db.delete(args.noteId);
  },
});
