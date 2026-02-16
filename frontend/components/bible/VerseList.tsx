import { FlatList, StyleSheet } from "react-native";
import { VerseItem } from "./VerseItem";
import type { Verse, CrossRef } from "@/hooks/useBibleApi";
import type { AnchorLayout } from "./BibleReader";

type Props = {
  verses: Verse[];
  crossRefsByVerse: Map<number, CrossRef[]>;
  selectedVerse: number | null;
  onVersePress: (verse: number) => void;
  onCrossRefPress: (crossRef: CrossRef) => void;
  onCrossRefHover?: (crossRef: CrossRef, layout: AnchorLayout) => void;
  onCrossRefHoverEnd?: () => void;
  onScrollBeginDrag?: () => void;
};

export function VerseList({
  verses,
  crossRefsByVerse,
  selectedVerse,
  onVersePress,
  onCrossRefPress,
  onCrossRefHover,
  onCrossRefHoverEnd,
  onScrollBeginDrag,
}: Props) {
  return (
    <FlatList
      data={verses}
      keyExtractor={(item) => item.verse.toString()}
      renderItem={({ item }) => (
        <VerseItem
          verse={item}
          crossRefs={crossRefsByVerse.get(item.verse) || []}
          isSelected={item.verse === selectedVerse}
          onPress={() =>
            onVersePress(item.verse === selectedVerse ? -1 : item.verse)
          }
          onCrossRefPress={onCrossRefPress}
          onCrossRefHover={onCrossRefHover}
          onCrossRefHoverEnd={onCrossRefHoverEnd}
        />
      )}
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
