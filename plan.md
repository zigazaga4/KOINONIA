# Plan: Save Conversations to Convex + Conversation Picker

## Problem
Chat conversations are ephemeral (React state only). Need persistent storage in Convex and a way to browse/restore past conversations.

## Approach
Since Convex server-side auth (`getUserIdentity()`) is broken (WebSocket callback issue), we'll use a **device-stable ID** stored in localStorage/SecureStore as the user identifier for conversations. This is consistent with the current API key auth approach.

## Changes

### 1. Convex Schema — add 2 tables (`server/convex/schema.ts`)
```
conversations: { deviceId, title, createdAt, updatedAt }
  indexes: by_device [deviceId, updatedAt]

aiMessages: { conversationId, role, content, toolCalls (optional), createdAt }
  indexes: by_conversation [conversationId, createdAt]
```

### 2. Convex Functions — new file (`server/convex/conversations.ts`)
- `list` query: get conversations by deviceId, ordered by updatedAt desc, limit 50
- `create` mutation: create conversation, return its ID
- `get` query: get a conversation + its messages
- `saveMessage` mutation: append a message to a conversation, update conversation's `updatedAt`
- `updateTitle` mutation: set conversation title
- `remove` mutation: delete a conversation and its messages

### 3. Device ID hook — new file (`frontend/hooks/useDeviceId.ts`)
- Generates a random UUID on first use
- Persists to localStorage (web) / SecureStore (native)
- Returns a stable string ID across sessions

### 4. Chat Stream hook — update (`frontend/hooks/useChatStream.ts`)
- Accept `conversationId` and `initialMessages` props
- On send: save user message to Convex, then save assistant message when stream completes
- Save tool calls alongside assistant messages
- Return `conversationId` so ChatPanel can track it

### 5. ChatPanel — update (`frontend/components/bible/ChatPanel.tsx`)
- Add conversation picker button in header (history icon)
- On first message: create a new conversation in Convex, set title from first user message
- Pass conversationId/initialMessages down to useChatStream
- Add "New Chat" button in header

### 6. ConversationList — new component (`frontend/components/bible/ConversationList.tsx`)
- Dropdown/overlay showing past conversations
- Each item shows title + relative time ("2 hours ago")
- Click to load that conversation's messages
- Delete button per conversation
- Uses Convex `useQuery` for real-time list updates

## UI Layout (ChatPanel header)
```
[+ New] [Bible Study AI                    ] [History icon]
```
- Left: "+" button for new chat
- Center: title
- Right: history/list icon (opens conversation list overlay)
- On mobile modal: close button stays on right, history moves to left

## File Summary
| File | Action |
|------|--------|
| `server/convex/schema.ts` | Edit — add `conversations` + `aiMessages` tables |
| `server/convex/conversations.ts` | Create — queries + mutations |
| `frontend/hooks/useDeviceId.ts` | Create — stable device ID |
| `frontend/hooks/useChatStream.ts` | Edit — save messages to Convex |
| `frontend/components/bible/ChatPanel.tsx` | Edit — conversation management + picker button |
| `frontend/components/bible/ConversationList.tsx` | Create — conversation list overlay |
