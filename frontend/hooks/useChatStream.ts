import { useState, useCallback, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../server/convex/_generated/api";
import type { Id } from "../../server/convex/_generated/dataModel";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3141";

export type ToolCall = {
  name: string;
  args: Record<string, unknown>;
  result?: {
    reference?: string;
    verses?: Array<{ verse: number; text: string }>;
    error?: string;
    message?: string;
    [key: string]: unknown;
  };
};

export type WebSource = {
  url: string;
  title: string;
  cited_text?: string;
};

export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_call"; toolCall: ToolCall };

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  thinking?: string;
  toolCalls?: ToolCall[];
  sources?: WebSource[];
  isSearching?: boolean;
  contentBlocks?: ContentBlock[];
};

export type PanelInfo = {
  translation: string;
  bookName: string;
  chapter: number;
};

function updateLastAssistant(
  prev: ChatMessage[],
  updater: (msg: ChatMessage) => ChatMessage
): ChatMessage[] {
  const updated = [...prev];
  const last = updated[updated.length - 1];
  if (last?.role === "assistant") {
    updated[updated.length - 1] = updater(last);
  }
  return updated;
}

export type OpenPanelInfo = {
  translation: string;
  bookId: number;
  bookName: string;
  chapter: number;
};

type SlideData = { title: string; html: string };

export type PresentationSummary = {
  id: string;
  title: string;
  mode: string;
};

export type PresentationUpdateData = {
  mode: string;
  title: string;
  html?: string;
  themeCss?: string;
  slides?: SlideData[];
  presentationId?: string;
};

export type HighlightVerseData = {
  bookId: number;
  chapter: number;
  verse: number;
  startWord: number;
  endWord: number;
  color: string;
};

export type CreateNoteData = {
  bookId: number;
  bookName: string;
  chapter: number;
  verse: number;
  content: string;
  color: string;
  verseText: string;
};

type UseChatStreamOptions = {
  panels: PanelInfo[];
  token: string | null;
  conversationId: Id<"conversations"> | null;
  presentation?: { id?: string; mode: string; html?: string; themeCss?: string; slides?: SlideData[] };
  presentationSummaries?: PresentationSummary[];
  onConversationCreated?: (id: Id<"conversations">) => void;
  initialMessages?: ChatMessage[];
  onOpenPanel?: (info: OpenPanelInfo) => void;
  onPresentationUpdate?: (data: PresentationUpdateData) => void;
  onPresentationStreaming?: (partialHtml: string) => void;
  onSwitchPresentation?: (presentationId: string) => void;
  onHighlightVerse?: (data: HighlightVerseData) => void;
  onCreateNote?: (data: CreateNoteData) => void;
};

export function useChatStream({
  panels,
  token,
  conversationId,
  onConversationCreated,
  initialMessages,
  onOpenPanel,
  onPresentationUpdate,
  onPresentationStreaming,
  onSwitchPresentation,
  onHighlightVerse,
  onCreateNote,
  presentation: presentationData,
  presentationSummaries,
}: UseChatStreamOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages || []);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const convoIdRef = useRef<Id<"conversations"> | null>(conversationId);
  convoIdRef.current = conversationId;

  const createConversation = useMutation(api.conversations.create);
  const saveMessageMut = useMutation(api.conversations.saveMessage);
  const updateTitle = useMutation(api.conversations.updateTitle);

  // Reset messages when initialMessages changes (conversation switch)
  const resetMessages = useCallback((msgs: ChatMessage[]) => {
    setMessages(msgs);
  }, []);

  const sendMessage = useCallback(
    async (userText: string) => {
      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: userText,
      };

      const updatedMessages = [...messages, userMsg];

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
        toolCalls: [],
      };

      setMessages([...updatedMessages, assistantMsg]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      // Create conversation on first message if needed
      let activeConvoId = convoIdRef.current;
      if (!activeConvoId) {
        try {
          const title = userText.length > 60 ? userText.slice(0, 57) + "..." : userText;
          activeConvoId = await createConversation({ title });
          convoIdRef.current = activeConvoId;
          onConversationCreated?.(activeConvoId);
        } catch {
          // Continue without persistence if creation fails
        }
      }

      // Save user message to Convex
      if (activeConvoId) {
        try {
          await saveMessageMut({
            conversationId: activeConvoId,
            role: "user",
            content: userText,
          });
        } catch {}
      }

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}/api/chat`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            messages: updatedMessages.map((m) => ({
              role: m.role,
              content: m.content,
              toolCalls: m.toolCalls,
            })),
            panels,
            presentation: presentationData || undefined,
            presentationSummaries: presentationSummaries || undefined,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(
            response.status === 401
              ? "Not authenticated. Please sign out and sign back in."
              : `Server error (${response.status}): ${errorBody}`
          );
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        let currentEvent = "";
        let dataLines: string[] = [];

        // Track accumulated content, thinking, tool calls, and web sources for saving
        let accumulatedContent = "";
        let accumulatedThinking = "";
        let accumulatedToolCalls: ToolCall[] = [];
        let accumulatedSources: WebSource[] = [];
        let accumulatedBlocks: ContentBlock[] = [];

        function processEvent() {
          if (!currentEvent || dataLines.length === 0) return;

          const data = dataLines.join("\n");

          switch (currentEvent) {
            case "thinking":
              accumulatedThinking += data;
              setMessages((prev) =>
                updateLastAssistant(prev, (msg) => ({
                  ...msg,
                  thinking: (msg.thinking || "") + data,
                }))
              );
              break;

            case "text":
              accumulatedContent += data;
              // Append to last text block or create a new one
              if (accumulatedBlocks.length > 0 && accumulatedBlocks[accumulatedBlocks.length - 1].type === "text") {
                (accumulatedBlocks[accumulatedBlocks.length - 1] as { type: "text"; text: string }).text += data;
              } else {
                accumulatedBlocks.push({ type: "text", text: data });
              }
              {
                const blocksCopy = accumulatedBlocks.map((b) => ({ ...b }));
                setMessages((prev) =>
                  updateLastAssistant(prev, (msg) => ({
                    ...msg,
                    content: msg.content + data,
                    contentBlocks: blocksCopy,
                  }))
                );
              }
              break;

            case "tool_call_start":
              // Tool name is known immediately — show loading state
              try {
                const start = JSON.parse(data) as { name: string };
                const newToolCall: ToolCall = { name: start.name, args: {} };
                accumulatedToolCalls.push(newToolCall);
                accumulatedBlocks.push({ type: "tool_call", toolCall: newToolCall });
                const blocksCopy = accumulatedBlocks.map((b) =>
                  b.type === "tool_call" ? { ...b, toolCall: { ...b.toolCall } } : { ...b }
                );
                setMessages((prev) =>
                  updateLastAssistant(prev, (msg) => ({
                    ...msg,
                    toolCalls: [...(msg.toolCalls || []), { name: start.name, args: {} }],
                    contentBlocks: blocksCopy,
                  }))
                );
              } catch {}
              break;

            case "tool_call":
              // Full tool call with args — update the existing placeholder
              try {
                const call = JSON.parse(data) as { name: string; args: Record<string, unknown> };
                // Update accumulated entry and matching block
                for (let i = accumulatedToolCalls.length - 1; i >= 0; i--) {
                  if (accumulatedToolCalls[i].name === call.name && Object.keys(accumulatedToolCalls[i].args).length === 0) {
                    accumulatedToolCalls[i].args = call.args;
                    break;
                  }
                }
                for (let i = accumulatedBlocks.length - 1; i >= 0; i--) {
                  const b = accumulatedBlocks[i];
                  if (b.type === "tool_call" && b.toolCall.name === call.name && Object.keys(b.toolCall.args).length === 0) {
                    b.toolCall.args = call.args;
                    break;
                  }
                }
                const blocksCopy = accumulatedBlocks.map((b) =>
                  b.type === "tool_call" ? { ...b, toolCall: { ...b.toolCall } } : { ...b }
                );
                setMessages((prev) =>
                  updateLastAssistant(prev, (msg) => {
                    const calls = [...(msg.toolCalls || [])];
                    for (let i = calls.length - 1; i >= 0; i--) {
                      if (calls[i].name === call.name && Object.keys(calls[i].args).length === 0) {
                        calls[i] = { ...calls[i], args: call.args };
                        break;
                      }
                    }
                    return { ...msg, toolCalls: calls, contentBlocks: blocksCopy };
                  })
                );
              } catch {}
              break;

            case "tool_result":
              try {
                const result = JSON.parse(data) as {
                  name: string;
                  args: Record<string, unknown>;
                  result: ToolCall["result"];
                };
                // Update accumulated tool calls and matching block
                for (let i = accumulatedToolCalls.length - 1; i >= 0; i--) {
                  if (accumulatedToolCalls[i].name === result.name && !accumulatedToolCalls[i].result) {
                    accumulatedToolCalls[i].result = result.result;
                    break;
                  }
                }
                for (let i = accumulatedBlocks.length - 1; i >= 0; i--) {
                  const b = accumulatedBlocks[i];
                  if (b.type === "tool_call" && b.toolCall.name === result.name && !b.toolCall.result) {
                    b.toolCall.result = result.result;
                    break;
                  }
                }
                const blocksCopy = accumulatedBlocks.map((b) =>
                  b.type === "tool_call" ? { ...b, toolCall: { ...b.toolCall } } : { ...b }
                );
                setMessages((prev) =>
                  updateLastAssistant(prev, (msg) => {
                    const calls = [...(msg.toolCalls || [])];
                    for (let i = calls.length - 1; i >= 0; i--) {
                      if (calls[i].name === result.name && !calls[i].result) {
                        calls[i] = { ...calls[i], result: result.result };
                        break;
                      }
                    }
                    return { ...msg, toolCalls: calls, contentBlocks: blocksCopy };
                  })
                );
              } catch {}
              break;

            case "open_panel":
              try {
                const panelInfo = JSON.parse(data) as OpenPanelInfo;
                onOpenPanel?.(panelInfo);
              } catch {}
              break;

            case "presentation_streaming":
              // Partial HTML as the AI generates the presentation
              try {
                const partial = JSON.parse(data) as { html: string };
                onPresentationStreaming?.(partial.html);
              } catch {}
              break;

            case "presentation_update":
              // Final complete presentation (document or slides)
              try {
                const update = JSON.parse(data) as PresentationUpdateData;
                onPresentationUpdate?.(update);
              } catch {}
              break;

            case "switch_presentation":
              // Server wants frontend to switch to a different presentation
              try {
                const sw = JSON.parse(data) as { presentationId: string };
                onSwitchPresentation?.(sw.presentationId);
              } catch {}
              break;

            case "highlight_verse":
              try {
                const hlData = JSON.parse(data) as HighlightVerseData;
                onHighlightVerse?.(hlData);
              } catch {}
              break;

            case "create_note":
              try {
                const noteData = JSON.parse(data) as CreateNoteData;
                onCreateNote?.(noteData);
              } catch {}
              break;

            case "web_search": {
              // Claude is searching the web — create a tool call block with query
              try {
                const wsData = JSON.parse(data) as { status: string; query?: string };
                const wsArgs = wsData.query ? { query: wsData.query } : {};
                const wsToolCall: ToolCall = { name: "web_search", args: wsArgs };
                accumulatedToolCalls.push(wsToolCall);
                accumulatedBlocks.push({ type: "tool_call", toolCall: wsToolCall });
                const wsBlocksCopy = accumulatedBlocks.map((b) =>
                  b.type === "tool_call" ? { ...b, toolCall: { ...b.toolCall } } : { ...b }
                );
                setMessages((prev) =>
                  updateLastAssistant(prev, (msg) => ({
                    ...msg,
                    toolCalls: [...(msg.toolCalls || []), { ...wsToolCall }],
                    contentBlocks: wsBlocksCopy,
                  }))
                );
              } catch {}
              break;
            }

            case "web_search_results":
              // Web search completed — update the web_search tool call with sources
              try {
                const wsResult = JSON.parse(data) as { sources: WebSource[] };
                accumulatedSources.push(...wsResult.sources);
                // Update accumulated tool call and block
                for (let i = accumulatedToolCalls.length - 1; i >= 0; i--) {
                  if (accumulatedToolCalls[i].name === "web_search" && !accumulatedToolCalls[i].result) {
                    accumulatedToolCalls[i].result = { sources: wsResult.sources } as any;
                    break;
                  }
                }
                for (let i = accumulatedBlocks.length - 1; i >= 0; i--) {
                  const b = accumulatedBlocks[i];
                  if (b.type === "tool_call" && b.toolCall.name === "web_search" && !b.toolCall.result) {
                    b.toolCall.result = { sources: wsResult.sources } as any;
                    break;
                  }
                }
                const wsrBlocksCopy = accumulatedBlocks.map((b) =>
                  b.type === "tool_call" ? { ...b, toolCall: { ...b.toolCall } } : { ...b }
                );
                setMessages((prev) =>
                  updateLastAssistant(prev, (msg) => {
                    const calls = [...(msg.toolCalls || [])];
                    for (let i = calls.length - 1; i >= 0; i--) {
                      if (calls[i].name === "web_search" && !calls[i].result) {
                        calls[i] = { ...calls[i], result: { sources: wsResult.sources } as any };
                        break;
                      }
                    }
                    return { ...msg, toolCalls: calls, contentBlocks: wsrBlocksCopy };
                  })
                );
              } catch {}
              break;

            case "citations":
              // Citation sources — add to the web_search tool call result
              try {
                const citationData = JSON.parse(data) as { sources: WebSource[] };
                const existingUrls = new Set(accumulatedSources.map((s) => s.url));
                const newSources = citationData.sources.filter((s) => !existingUrls.has(s.url));
                accumulatedSources.push(...newSources);
                if (newSources.length > 0) {
                  // Add citations to the most recent web_search tool call
                  for (let i = accumulatedToolCalls.length - 1; i >= 0; i--) {
                    if (accumulatedToolCalls[i].name === "web_search" && accumulatedToolCalls[i].result) {
                      const existing = ((accumulatedToolCalls[i].result as any).sources || []) as WebSource[];
                      const existSet = new Set(existing.map((s: WebSource) => s.url));
                      const toAdd = newSources.filter((s) => !existSet.has(s.url));
                      (accumulatedToolCalls[i].result as any).sources = [...existing, ...toAdd];
                      break;
                    }
                  }
                  for (let i = accumulatedBlocks.length - 1; i >= 0; i--) {
                    const b = accumulatedBlocks[i];
                    if (b.type === "tool_call" && b.toolCall.name === "web_search" && b.toolCall.result) {
                      const existing = ((b.toolCall.result as any).sources || []) as WebSource[];
                      const existSet = new Set(existing.map((s: WebSource) => s.url));
                      const toAdd = newSources.filter((s) => !existSet.has(s.url));
                      (b.toolCall.result as any).sources = [...existing, ...toAdd];
                      break;
                    }
                  }
                  const citBlocksCopy = accumulatedBlocks.map((b) =>
                    b.type === "tool_call" ? { ...b, toolCall: { ...b.toolCall } } : { ...b }
                  );
                  setMessages((prev) =>
                    updateLastAssistant(prev, (msg) => {
                      const calls = [...(msg.toolCalls || [])];
                      for (let i = calls.length - 1; i >= 0; i--) {
                        if (calls[i].name === "web_search" && calls[i].result) {
                          const existing = ((calls[i].result as any).sources || []) as WebSource[];
                          const existSet = new Set(existing.map((s: WebSource) => s.url));
                          const toAdd = newSources.filter((s) => !existSet.has(s.url));
                          calls[i] = { ...calls[i], result: { ...calls[i].result, sources: [...existing, ...toAdd] } as any };
                          break;
                        }
                      }
                      return { ...msg, toolCalls: calls, contentBlocks: citBlocksCopy };
                    })
                  );
                }
              } catch {}
              break;

            case "error":
              accumulatedContent = `Error: ${data}`;
              setMessages((prev) =>
                updateLastAssistant(prev, (msg) => ({
                  ...msg,
                  content: `Error: ${data}`,
                }))
              );
              break;
          }

          currentEvent = "";
          dataLines = [];
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            processEvent();
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line === "") {
              processEvent();
            } else if (line.startsWith("event: ")) {
              processEvent();
              currentEvent = line.slice(7);
            } else if (line.startsWith("data: ")) {
              dataLines.push(line.slice(6));
            } else if (line === "data:") {
              dataLines.push("");
            }
          }
        }

        // Save assistant message to Convex after stream completes
        if (activeConvoId && (accumulatedContent || accumulatedThinking)) {
          try {
            await saveMessageMut({
              conversationId: activeConvoId,
              role: "assistant",
              content: accumulatedContent,
              thinking: accumulatedThinking || undefined,
              toolCalls: accumulatedToolCalls.length > 0 ? accumulatedToolCalls : undefined,
            });
          } catch {}
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setMessages((prev) =>
          updateLastAssistant(prev, (msg) => ({
            ...msg,
            content: "Sorry, something went wrong. Please try again.",
          }))
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [messages, panels, token, presentationData, presentationSummaries, createConversation, saveMessageMut, updateTitle, onConversationCreated, onOpenPanel, onPresentationUpdate, onPresentationStreaming, onSwitchPresentation, onHighlightVerse, onCreateNote]
  );

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, isStreaming, sendMessage, cancelStream, clearMessages, resetMessages };
}
