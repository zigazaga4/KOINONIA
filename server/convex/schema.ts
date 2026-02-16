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
    deviceId: v.string(),
    title: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_device", ["deviceId", "updatedAt"]),

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
    createdAt: v.number(),
  }).index("by_conversation", ["conversationId", "createdAt"]),

  // Saved presentations (created by AI)
  presentations: defineTable({
    deviceId: v.string(),
    title: v.string(),
    mode: v.optional(v.string()), // "document" | "slides" — missing means "document" (backward compat)
    html: v.optional(v.string()), // document mode
    themeCss: v.optional(v.string()), // slides mode
    slides: v.optional(v.array(v.object({ title: v.string(), html: v.string() }))), // slides mode
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_device", ["deviceId", "updatedAt"]),
});
