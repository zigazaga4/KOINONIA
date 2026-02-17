import { View, Text, TouchableOpacity, Platform, StyleSheet } from "react-native";
import React, { useMemo } from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { KoinoniaColors } from "@/constants/Colors";
import { Fonts } from "@/constants/Fonts";
import { hexToBg } from "@/constants/HighlightColors";
import type { CrossRef } from "@/hooks/useBibleApi";
import type { AnchorLayout } from "./BibleReader";
import type { Highlight } from "@/hooks/useHighlights";

export type WordSelectionState = {
  verse: number;
  color: string;
  startWord: number | null;
};

type Props = {
  verse: { verse: number; text: string };
  crossRefs: CrossRef[];
  isSelected: boolean;
  highlights: Highlight[];
  isHighlightMode: boolean;
  wordSelection: WordSelectionState | null;
  hasNote: boolean;
  onPress: () => void;
  onCrossRefPress: (crossRef: CrossRef) => void;
  onCrossRefHover?: (crossRef: CrossRef, layout: AnchorLayout) => void;
  onCrossRefHoverEnd?: () => void;
  onWordPress?: (verseNum: number, wordIndex: number) => void;
  onAddNote?: (verseNum: number) => void;
};

function VerseItemInner({
  verse,
  crossRefs,
  isSelected,
  highlights,
  isHighlightMode,
  wordSelection,
  hasNote,
  onPress,
  onCrossRefPress,
  onCrossRefHover,
  onCrossRefHoverEnd,
  onWordPress,
  onAddNote,
}: Props) {
  const words = useMemo(() => verse.text.split(/\s+/), [verse.text]);

  // Build per-word color map (last-write-wins by createdAt)
  // color field is a hex string (e.g. "#C8902E")
  const wordColors = useMemo(() => {
    if (highlights.length === 0) return null;
    const sorted = [...highlights].sort((a, b) => a.createdAt - b.createdAt);
    const map = new Map<number, string>();
    for (const h of sorted) {
      const bg = hexToBg(h.color);
      for (let i = h.startWord; i <= h.endWord && i < words.length; i++) {
        map.set(i, bg);
      }
    }
    return map;
  }, [highlights, words.length]);

  const isWordSelecting =
    isHighlightMode && wordSelection && wordSelection.verse === verse.verse;

  const renderText = () => {
    if (!wordColors && !isWordSelecting) {
      // Fast path: no highlights, no selection mode for this verse
      return <Text style={styles.text}>{verse.text}</Text>;
    }

    return (
      <Text style={styles.text}>
        {words.map((word, i) => {
          const bgColor = wordColors?.get(i);
          // Show tentative highlight for start word during selection
          const isTentativeStart =
            isWordSelecting && wordSelection!.startWord === i;
          const tentativeColor = isTentativeStart
            ? hexToBg(wordSelection!.color)
            : undefined;

          const wordStyle = (bgColor || tentativeColor)
            ? { backgroundColor: tentativeColor || bgColor }
            : undefined;

          if (isWordSelecting) {
            return (
              <Text
                key={i}
                style={wordStyle}
                onPress={() => onWordPress?.(verse.verse, i)}
              >
                {word}
                {i < words.length - 1 ? " " : ""}
              </Text>
            );
          }

          return (
            <Text key={i} style={wordStyle}>
              {word}
              {i < words.length - 1 ? " " : ""}
            </Text>
          );
        })}
      </Text>
    );
  };

  return (
    <TouchableOpacity
      style={[styles.container, isSelected && styles.selected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.number}>{verse.verse}</Text>
      <View style={styles.content}>
        {renderText()}
        {crossRefs.length > 0 && (
          <View style={styles.refsRow}>
            {crossRefs.map((cr, i) => {
              const webHoverProps =
                Platform.OS === "web" && onCrossRefHover
                  ? {
                      onMouseEnter: (e: any) => {
                        const rect = e.target.getBoundingClientRect();
                        onCrossRefHover(cr, {
                          pageX: rect.left,
                          pageY: rect.top,
                          width: rect.width,
                          height: rect.height,
                        });
                      },
                      onMouseLeave: () => {
                        onCrossRefHoverEnd?.();
                      },
                    }
                  : {};

              return (
                <TouchableOpacity
                  key={`${cr.to_book}-${cr.to_chapter}-${cr.to_verse}-${i}`}
                  onPress={() => onCrossRefPress(cr)}
                  hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
                  {...webHoverProps}
                >
                  <Text style={styles.refText}>
                    {cr.book_name} {cr.to_chapter}:{cr.to_verse}
                    {cr.to_end_verse ? `-${cr.to_end_verse}` : ""}
                    {i < crossRefs.length - 1 ? ";" : ""}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        {hasNote && (
          <View style={styles.noteIndicator}>
            <FontAwesome name="sticky-note-o" size={11} color={KoinoniaColors.warmGray} />
            <Text style={styles.noteIndicatorText}>Note</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export const VerseItem = React.memo(VerseItemInner);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: KoinoniaColors.divider,
  },
  selected: {
    backgroundColor: KoinoniaColors.sand,
    borderLeftWidth: 3,
    borderLeftColor: KoinoniaColors.primary,
  },
  number: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: KoinoniaColors.primary,
    marginRight: 8,
    marginTop: 4,
    minWidth: 22,
    textAlign: "right",
  },
  content: {
    flex: 1,
  },
  text: {
    fontFamily: Fonts.heading,
    fontSize: 17,
    lineHeight: 28,
    color: KoinoniaColors.darkBrown,
  },
  refsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
    gap: 4,
  },
  refText: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: KoinoniaColors.warmGray,
    textDecorationLine: "underline",
  },
  noteIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  noteIndicatorText: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: KoinoniaColors.warmGray,
  },
});
