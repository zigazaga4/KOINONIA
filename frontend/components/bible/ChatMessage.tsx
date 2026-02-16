import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useState } from "react";
import Markdown from "react-native-markdown-display";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { ToolCallBlock } from "./ToolCallBlock";
import { KoinoniaColors } from "@/constants/Colors";
import { Fonts } from "@/constants/Fonts";
import type { ChatMessage as ChatMessageType, ContentBlock } from "@/hooks/useChatStream";

type Props = {
  message: ChatMessageType;
};

function ThinkingBlock({ thinking }: { thinking: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={thinkingStyles.container}>
      <TouchableOpacity
        style={thinkingStyles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={thinkingStyles.headerLeft}>
          <FontAwesome name="lightbulb-o" size={13} color={KoinoniaColors.secondary} />
          <Text style={thinkingStyles.headerText}>Thinking</Text>
        </View>
        <FontAwesome
          name={expanded ? "chevron-up" : "chevron-down"}
          size={11}
          color={KoinoniaColors.warmGray}
        />
      </TouchableOpacity>
      {expanded && (
        <View style={thinkingStyles.body}>
          <Text selectable style={thinkingStyles.bodyText}>{thinking}</Text>
        </View>
      )}
    </View>
  );
}


export function ChatMessage({ message }: Props) {
  if (message.role === "user") {
    return (
      <View style={styles.userRow}>
        <Text style={styles.userLabel}>You</Text>
        <Text selectable style={styles.userText}>{message.content}</Text>
      </View>
    );
  }

  const hasThinking = !!message.thinking;
  const hasBlocks = message.contentBlocks && message.contentBlocks.length > 0;

  // When contentBlocks exist, render in order (preserves text/tool interleaving)
  // Otherwise fall back to legacy rendering (tool calls first, then text)
  return (
    <View style={styles.assistantRow}>
      {hasThinking && <ThinkingBlock thinking={message.thinking!} />}
      {hasBlocks ? (
        // Ordered rendering — blocks appear in the sequence they arrived
        message.contentBlocks!.map((block, i) => {
          if (block.type === "text") {
            return block.text ? (
              <Markdown key={`text-${i}`} style={markdownStyles}>{block.text}</Markdown>
            ) : null;
          }
          if (block.type === "tool_call") {
            return (
              <View key={`tc-${i}`} style={styles.toolCallsContainer}>
                <ToolCallBlock toolCall={block.toolCall} />
              </View>
            );
          }
          return null;
        })
      ) : (
        // Legacy rendering for loaded history (no contentBlocks)
        <>
          {message.toolCalls && message.toolCalls.length > 0 && (
            <View style={styles.toolCallsContainer}>
              {message.toolCalls.map((tc, i) => (
                <ToolCallBlock key={`${tc.name}-${i}`} toolCall={tc} />
              ))}
            </View>
          )}
          {(message.content || (!message.toolCalls?.length ? "..." : "")) ? (
            <Markdown style={markdownStyles}>
              {message.content || (!message.toolCalls?.length ? "..." : "")}
            </Markdown>
          ) : null}
        </>
      )}
    </View>
  );
}

const thinkingStyles = StyleSheet.create({
  container: {
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: KoinoniaColors.border,
    backgroundColor: KoinoniaColors.sand,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: KoinoniaColors.secondary,
  },
  body: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: KoinoniaColors.divider,
    paddingTop: 8,
    maxHeight: 300,
  },
  bodyText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: KoinoniaColors.warmGray,
  },
});

const styles = StyleSheet.create({
  userRow: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: KoinoniaColors.divider,
  },
  userLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: KoinoniaColors.warmGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  userText: {
    fontFamily: Fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: KoinoniaColors.darkBrown,
  },
  assistantRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  toolCallsContainer: {
    marginBottom: 8,
  },
});


const markdownStyles = StyleSheet.create({
  body: {
    fontFamily: Fonts.body,
    fontSize: 15,
    lineHeight: 24,
    color: KoinoniaColors.darkBrown,
  },
  heading1: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 22,
    lineHeight: 30,
    color: KoinoniaColors.darkBrown,
    marginTop: 16,
    marginBottom: 8,
  },
  heading2: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 19,
    lineHeight: 26,
    color: KoinoniaColors.darkBrown,
    marginTop: 14,
    marginBottom: 6,
  },
  heading3: {
    fontFamily: Fonts.headingMedium,
    fontSize: 17,
    lineHeight: 24,
    color: KoinoniaColors.darkBrown,
    marginTop: 12,
    marginBottom: 4,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 10,
  },
  strong: {
    fontFamily: Fonts.bodySemiBold,
  },
  em: {
    fontStyle: "italic",
  },
  blockquote: {
    backgroundColor: KoinoniaColors.cream,
    borderLeftWidth: 3,
    borderLeftColor: KoinoniaColors.primary,
    paddingLeft: 12,
    paddingVertical: 6,
    marginVertical: 8,
  },
  code_inline: {
    fontFamily: "monospace",
    fontSize: 14,
    backgroundColor: KoinoniaColors.sand,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    color: KoinoniaColors.secondaryDark,
  },
  fence: {
    fontFamily: "monospace",
    fontSize: 13,
    backgroundColor: KoinoniaColors.sand,
    padding: 12,
    borderRadius: 6,
    marginVertical: 8,
  },
  bullet_list: {
    marginVertical: 4,
  },
  ordered_list: {
    marginVertical: 4,
  },
  list_item: {
    marginVertical: 2,
  },
  link: {
    color: KoinoniaColors.primary,
    textDecorationLine: "underline",
  },
  hr: {
    backgroundColor: KoinoniaColors.divider,
    height: 1,
    marginVertical: 12,
  },
});
