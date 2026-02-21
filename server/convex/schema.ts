import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  // User profiles (extends the auth user)
  userProfiles: defineTable({
    userId: v.string(),
    name: v.string(),
    bio: v.optional(v.string()),
    church: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),

  // Posts (social media feed)
  posts: defineTable({
    authorId: v.string(),
    content: v.string(),
    imageUrl: v.optional(v.string()),
    likes: v.number(),
    createdAt: v.number(),
  })
    .index("by_author", ["authorId"])
    .index("by_created", ["createdAt"]),

  // Bible study groups
  groups: defineTable({
    name: v.string(),
    description: v.string(),
    creatorId: v.string(),
    imageUrl: v.optional(v.string()),
    isPublic: v.boolean(),
    createdAt: v.number(),
  }).index("by_creator", ["creatorId"]),

  // Group members
  groupMembers: defineTable({
    groupId: v.id("groups"),
    userId: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
    joinedAt: v.number(),
  })
    .index("by_group", ["groupId"])
    .index("by_user", ["userId"]),

  // Messages (for group chat / direct messages)
  messages: defineTable({
    groupId: v.id("groups"),
    authorId: v.string(),
    content: v.string(),
    createdAt: v.number(),
  }).index("by_group", ["groupId", "createdAt"]),

  // AI chat conversations
  conversations: defineTable({
    userId: v.optional(v.id("users")),
    deviceId: v.optional(v.string()), // legacy — kept for backward compat with old records
    title: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId", "updatedAt"]),

  // AI chat messages (separate from group messages)
  aiMessages: defineTable({
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
    contentBlocks: v.optional(
      v.array(
        v.union(
          v.object({ type: v.literal("text"), text: v.string() }),
          v.object({
            type: v.literal("tool_call"),
            toolCall: v.object({
              name: v.string(),
              args: v.any(),
              result: v.optional(v.any()),
            }),
          })
        )
      )
    ),
    createdAt: v.number(),
  }).index("by_conversation", ["conversationId", "createdAt"]),

  // Saved presentations (created by AI)
  presentations: defineTable({
    userId: v.optional(v.id("users")),
    deviceId: v.optional(v.string()), // legacy — kept for backward compat with old records
    title: v.string(),
    mode: v.optional(v.string()), // "document" | "slides" — missing means "document" (backward compat)
    html: v.optional(v.string()), // document mode
    themeCss: v.optional(v.string()), // slides mode
    slides: v.optional(v.array(v.object({ title: v.string(), html: v.string() }))), // slides mode
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId", "updatedAt"]),

  // Bible verse highlights
  highlights: defineTable({
    userId: v.id("users"),
    bookId: v.number(),
    chapter: v.number(),
    verse: v.number(),
    startWord: v.number(),
    endWord: v.number(),
    color: v.string(),
    createdAt: v.number(),
  }).index("by_user_chapter", ["userId", "bookId", "chapter"]),

  // Bible verse notes
  notes: defineTable({
    userId: v.id("users"),
    bookId: v.number(),
    chapter: v.number(),
    verse: v.number(),
    content: v.string(),
    color: v.string(),
    verseText: v.string(),
    bookName: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_chapter", ["userId", "bookId", "chapter"])
    .index("by_user_all", ["userId", "updatedAt"]),

  // Study journal entries
  journalEntries: defineTable({
    userId: v.id("users"),
    title: v.string(),
    content: v.string(),         // markdown
    bookId: v.number(),
    chapter: v.number(),
    verse: v.optional(v.number()),
    bookName: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId", "createdAt"]),

  // Stripe subscriptions — one per user
  subscriptions: defineTable({
    userId: v.id("users"),
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
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_stripeCustomerId", ["stripeCustomerId"])
    .index("by_stripeSubscriptionId", ["stripeSubscriptionId"]),

  // Monthly usage tracking — one record per user per billing period
  usage: defineTable({
    userId: v.id("users"),
    periodStart: v.number(),
    periodEnd: v.number(),
    messageCount: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId_period", ["userId", "periodStart"]),
});
