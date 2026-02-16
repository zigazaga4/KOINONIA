import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useState } from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { KoinoniaColors } from "@/constants/Colors";
import { Fonts } from "@/constants/Fonts";
import type { ToolCall } from "@/hooks/useChatStream";

type Props = {
  toolCall: ToolCall;
};

function formatToolName(name: string): string {
  if (name === "read_passage") return "Read Passage";
  if (name === "write_presentation") return "Write Presentation";
  if (name === "read_presentation") return "Read Presentation";
  if (name === "edit_presentation") return "Edit Presentation";
  if (name === "list_presentations") return "List Presentations";
  if (name === "open_bible_panel") return "Open Bible Panel";
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatArgs(args: Record<string, unknown>): string {
  // Empty args means the tool call is still generating
  if (!args || Object.keys(args).length === 0) return "";
  const parts: string[] = [];
  if (args.book_name) parts.push(String(args.book_name));
  if (args.chapter) parts.push(String(args.chapter));
  if (args.from_verse && args.to_verse) {
    parts[parts.length - 1] += `:${args.from_verse}-${args.to_verse}`;
  } else if (args.from_verse) {
    parts[parts.length - 1] += `:${args.from_verse}`;
  }
  if (args.translation) parts.push(`(${args.translation})`);
  if (args.title) parts.push(String(args.title));
  return parts.join(" ") || JSON.stringify(args);
}

// Presentation tools should not show code/HTML to the user
const HIDDEN_CONTENT_TOOLS = new Set([
  "write_presentation",
  "read_presentation",
  "edit_presentation",
  "list_presentations",
]);

function getStatusText(toolCall: ToolCall): string | null {
  if (!HIDDEN_CONTENT_TOOLS.has(toolCall.name)) return null;
  const hasArgs = toolCall.args && Object.keys(toolCall.args).length > 0;
  const hasResult = !!toolCall.result;
  if (toolCall.name === "list_presentations") {
    if (!hasResult) return "Listing presentations...";
    return "Listed presentations";
  }
  if (!hasArgs && !hasResult) return "Generating...";
  if (hasArgs && !hasResult) {
    if (toolCall.name === "read_presentation") {
      const target = toolCall.args.target as string | undefined;
      if (target === "outline") return "Reading slide outline...";
      if (target === "slide") {
        const num = toolCall.args.slide_number;
        return num ? `Reading slide ${num}...` : "Reading slide...";
      }
      if (target === "theme") return "Reading theme...";
      return "Reading presentation...";
    }
    if (toolCall.name === "edit_presentation") {
      const action = toolCall.args.action as string | undefined;
      if (action === "add_slide") return "Adding slide...";
      if (action === "remove_slide") return "Removing slide...";
      return "Editing presentation...";
    }
    // write_presentation
    const mode = toolCall.args.mode as string | undefined;
    if (mode === "slides") return "Writing slides...";
    return "Writing presentation...";
  }
  if (toolCall.result?.error) return "Error";
  if (toolCall.name === "read_presentation") return "Read presentation";
  if (toolCall.name === "edit_presentation") {
    const msg = toolCall.result?.message;
    return typeof msg === "string" ? msg : "Presentation edited";
  }
  return "Presentation updated";
}

export function ToolCallBlock({ toolCall }: Props) {
  const [expanded, setExpanded] = useState(false);
  const hasResult = !!toolCall.result;
  const hasArgs = toolCall.args && Object.keys(toolCall.args).length > 0;
  const isGenerating = !hasArgs && !hasResult;
  const isLoading = !hasResult;
  const hideContent = HIDDEN_CONTENT_TOOLS.has(toolCall.name);

  const iconName = toolCall.name === "write_presentation" || toolCall.name === "read_presentation" || toolCall.name === "edit_presentation" || toolCall.name === "list_presentations"
    ? "television"
    : toolCall.name === "open_bible_panel" ? "columns" : "book";

  const statusText = getStatusText(toolCall);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => hasResult && !hideContent && setExpanded(!expanded)}
        activeOpacity={hasResult && !hideContent ? 0.7 : 1}
      >
        <View style={styles.headerLeft}>
          {isLoading ? (
            <FontAwesome name="spinner" size={13} color={KoinoniaColors.primary} />
          ) : (
            <FontAwesome name={iconName} size={13} color={KoinoniaColors.accent} />
          )}
          <Text style={styles.toolName}>{formatToolName(toolCall.name)}</Text>
          {statusText ? (
            <Text style={isLoading ? styles.toolArgsLoading : styles.toolArgs}>
              {statusText}
            </Text>
          ) : isGenerating ? (
            <Text style={styles.toolArgsLoading}>Generating...</Text>
          ) : (
            <Text style={styles.toolArgs}>{formatArgs(toolCall.args)}</Text>
          )}
        </View>
        {hasResult && !hideContent && (
          <FontAwesome
            name={expanded ? "chevron-up" : "chevron-down"}
            size={11}
            color={KoinoniaColors.warmGray}
          />
        )}
      </TouchableOpacity>

      {expanded && toolCall.result && !hideContent && (
        <View style={styles.resultContainer}>
          {toolCall.result.error ? (
            <Text style={styles.errorText}>{toolCall.result.error}</Text>
          ) : toolCall.result.verses ? (
            <>
              {toolCall.result.reference && (
                <Text style={styles.reference}>{toolCall.result.reference}</Text>
              )}
              {toolCall.result.verses.map((v) => (
                <Text key={v.verse} style={styles.verseText}>
                  <Text style={styles.verseNum}>{v.verse} </Text>
                  {v.text}
                </Text>
              ))}
            </>
          ) : (
            <Text style={styles.rawResult}>
              {JSON.stringify(toolCall.result, null, 2)}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: KoinoniaColors.border,
    backgroundColor: KoinoniaColors.cream,
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
    flex: 1,
  },
  toolName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: KoinoniaColors.darkBrown,
  },
  toolArgs: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: KoinoniaColors.warmGray,
    flex: 1,
  },
  toolArgsLoading: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    color: KoinoniaColors.primary,
    fontStyle: "italic",
  },
  resultContainer: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: KoinoniaColors.divider,
    paddingTop: 8,
  },
  reference: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 13,
    color: KoinoniaColors.secondary,
    marginBottom: 6,
  },
  verseText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: KoinoniaColors.darkBrown,
    marginBottom: 2,
  },
  verseNum: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    color: KoinoniaColors.warmGray,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: KoinoniaColors.error,
  },
  rawResult: {
    fontFamily: "monospace",
    fontSize: 12,
    color: KoinoniaColors.warmGray,
  },
});
