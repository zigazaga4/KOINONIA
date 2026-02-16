import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRef, useEffect, useState, useCallback } from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useQuery } from "convex/react";
import { api } from "../../../server/convex/_generated/api";
import type { Id } from "../../../server/convex/_generated/dataModel";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ConversationList } from "./ConversationList";
import { useChatStream } from "@/hooks/useChatStream";
import { useApiAuth } from "@/hooks/useApiAuth";
import { useDeviceId } from "@/hooks/useDeviceId";
import { KoinoniaColors } from "@/constants/Colors";
import { Fonts } from "@/constants/Fonts";
import type { PanelInfo, ChatMessage as ChatMessageType, OpenPanelInfo, PresentationUpdateData, PresentationSummary } from "@/hooks/useChatStream";

type SlideData = { title: string; html: string };

type Props = {
  panels: PanelInfo[];
  isModal?: boolean;
  visible?: boolean;
  onClose?: () => void;
  onOpenPanel?: (info: OpenPanelInfo) => void;
  onPresentationUpdate?: (data: PresentationUpdateData) => void;
  onPresentationStreaming?: (partialHtml: string) => void;
  onSwitchPresentation?: (presentationId: string) => void;
  presentation?: { id?: string; mode: string; html?: string; themeCss?: string; slides?: SlideData[] };
  presentationSummaries?: PresentationSummary[];
};

export function ChatPanel({ panels, isModal, visible, onClose, onOpenPanel, onPresentationUpdate, onPresentationStreaming, onSwitchPresentation, presentation, presentationSummaries }: Props) {
  const { token } = useApiAuth();
  const deviceId = useDeviceId();
  const [conversationId, setConversationId] = useState<Id<"conversations"> | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [initialMessages, setInitialMessages] = useState<ChatMessageType[]>([]);
  // Only set when user picks a conversation from history — prevents reactive query
  // from resetting messages during active streaming
  const [pendingLoadId, setPendingLoadId] = useState<Id<"conversations"> | null>(null);

  // Only query messages when explicitly loading a conversation from history
  const storedMessages = useQuery(
    api.conversations.getMessages,
    pendingLoadId ? { conversationId: pendingLoadId } : "skip"
  );

  const handleConversationCreated = useCallback((id: Id<"conversations">) => {
    setConversationId(id);
    // Don't set pendingLoadId — we're creating, not loading
  }, []);

  const { messages, isStreaming, sendMessage, resetMessages } = useChatStream({
    panels,
    token,
    deviceId,
    conversationId,
    onConversationCreated: handleConversationCreated,
    initialMessages,
    onOpenPanel,
    onPresentationUpdate,
    onPresentationStreaming,
    onSwitchPresentation,
    presentation,
    presentationSummaries,
  });

  const handleSelectConversation = useCallback((id: Id<"conversations">) => {
    setConversationId(id);
    setPendingLoadId(id); // Trigger message loading
  }, []);

  // When storedMessages loads (from selecting a conversation), populate the chat
  useEffect(() => {
    if (!storedMessages || !pendingLoadId) return;
    const mapped: ChatMessageType[] = storedMessages.map((m) => ({
      id: m._id,
      role: m.role,
      content: m.content,
      thinking: m.thinking ?? undefined,
      toolCalls: m.toolCalls as ChatMessageType["toolCalls"],
    }));
    setInitialMessages(mapped);
    resetMessages(mapped);
    setPendingLoadId(null); // Done loading — stop the reactive query
  }, [storedMessages, pendingLoadId]);

  const handleNewChat = useCallback(() => {
    setConversationId(null);
    setInitialMessages([]);
    resetMessages([]);
  }, [resetMessages]);

  const scrollRef = useRef<ScrollView>(null);
  const slideAnim = useRef(
    new Animated.Value(Dimensions.get("window").width)
  ).current;

  useEffect(() => {
    if (isModal) {
      Animated.timing(slideAnim, {
        toValue: visible ? 0 : Dimensions.get("window").width,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, isModal]);

  const content = (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={handleNewChat} style={styles.headerBtn}>
            <FontAwesome name="plus" size={14} color={KoinoniaColors.warmGray} />
          </TouchableOpacity>
        </View>

        <Text style={styles.headerTitle} numberOfLines={1}>
          Bible Study AI
        </Text>

        <View style={styles.headerRight}>
          {deviceId && (
            <TouchableOpacity
              onPress={() => setShowHistory(!showHistory)}
              style={styles.headerBtn}
            >
              <FontAwesome name="history" size={16} color={KoinoniaColors.warmGray} />
            </TouchableOpacity>
          )}
          {isModal && onClose && (
            <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
              <FontAwesome name="times" size={20} color={KoinoniaColors.warmGray} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {messages.length === 0 ? (
        <View style={styles.empty}>
          <FontAwesome name="comments" size={40} color={KoinoniaColors.border} />
          <Text style={styles.emptyTitle}>Bible Study Assistant</Text>
          <Text style={styles.emptyText}>
            Ask questions about the passage you're reading. I'll help you
            understand the context, cross-references, and deeper meaning.
          </Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {isStreaming && messages[messages.length - 1]?.content === "" &&
            !(messages[messages.length - 1]?.toolCalls?.length) && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={KoinoniaColors.primary} />
              <Text style={styles.loadingText}>Thinking...</Text>
            </View>
          )}
        </ScrollView>
      )}

      <ChatInput onSend={sendMessage} isStreaming={isStreaming} />

      {showHistory && deviceId && (
        <ConversationList
          deviceId={deviceId}
          activeConversationId={conversationId}
          onSelect={handleSelectConversation}
          onClose={() => setShowHistory(false)}
        />
      )}
    </View>
  );

  if (isModal) {
    return (
      <Animated.View
        style={[
          styles.modalOverlay,
          { transform: [{ translateX: slideAnim }] },
        ]}
        pointerEvents={visible ? "auto" : "none"}
      >
        {content}
      </Animated.View>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: KoinoniaColors.warmWhite,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: KoinoniaColors.divider,
    backgroundColor: KoinoniaColors.cream,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    width: 60,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    width: 60,
    gap: 4,
  },
  headerTitle: {
    flex: 1,
    fontFamily: Fonts.headingSemiBold,
    fontSize: 16,
    color: KoinoniaColors.darkBrown,
    textAlign: "center",
  },
  headerBtn: {
    padding: 6,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 18,
    color: KoinoniaColors.darkBrown,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 22,
    color: KoinoniaColors.warmGray,
    textAlign: "center",
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  loadingText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: KoinoniaColors.warmGray,
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: KoinoniaColors.warmWhite,
  },
});
