import { FlatList, StyleSheet } from "react-native";
import { useCallback } from "react";
import { VerseItem } from "./VerseItem";
import type { WordSelectionState } from "./VerseItem";
import type { Verse, CrossRef } from "@/hooks/useBibleApi";
import type { AnchorLayout } from "./BibleReader";
import type { Highlight } from "@/hooks/useHighlights";

type Props = {
  verses: Verse[];
  crossRefsByVerse: Map<number, CrossRef[]>;
  highlightsByVerse: Map<number, Highlight[]>;
  noteVerses: Set<number>;
  selectedVerse: number | null;
  isHighlightMode: boolean;
  wordSelection: WordSelectionState | null;
  onVersePress: (verse: number) => void;
  onCrossRefPress: (crossRef: CrossRef) => void;
  onCrossRefHover?: (crossRef: CrossRef, layout: AnchorLayout) => void;
  onCrossRefHoverEnd?: () => void;
  onScrollBeginDrag?: () => void;
  onWordPress?: (verseNum: number, wordIndex: number) => void;
  onAddNote?: (verseNum: number) => void;
};

const emptyHighlights: Highlight[] = [];

export function VerseList({
  verses,
  crossRefsByVerse,
  highlightsByVerse,
  noteVerses,
  selectedVerse,
  isHighlightMode,
  wordSelection,
  onVersePress,
  onCrossRefPress,
  onCrossRefHover,
  onCrossRefHoverEnd,
  onScrollBeginDrag,
  onWordPress,
  onAddNote,
}: Props) {
  const renderItem = useCallback(
    ({ item }: { item: Verse }) => (
      <VerseItem
        verse={item}
        crossRefs={crossRefsByVerse.get(item.verse) || []}
        highlights={highlightsByVerse.get(item.verse) || emptyHighlights}
        hasNote={noteVerses.has(item.verse)}
        isSelected={item.verse === selectedVerse}
        isHighlightMode={isHighlightMode}
        wordSelection={wordSelection}
        onPress={() =>
          onVersePress(item.verse === selectedVerse ? -1 : item.verse)
        }
        onCrossRefPress={onCrossRefPress}
        onCrossRefHover={onCrossRefHover}
        onCrossRefHoverEnd={onCrossRefHoverEnd}
        onWordPress={onWordPress}
        onAddNote={onAddNote}
      />
    ),
    [
      crossRefsByVerse,
      highlightsByVerse,
      noteVerses,
      selectedVerse,
      isHighlightMode,
      wordSelection,
      onVersePress,
      onCrossRefPress,
      onCrossRefHover,
      onCrossRefHoverEnd,
      onWordPress,
      onAddNote,
    ]
  );

  return (
    <FlatList
      data={verses}
      keyExtractor={(item) => item.verse.toString()}
      renderItem={renderItem}
      contentContainerStyle={styles.content}
      onScrollBeginDrag={onScrollBeginDrag}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: 4,
  },
});
