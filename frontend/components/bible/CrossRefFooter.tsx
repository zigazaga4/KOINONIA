import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { KoinoniaColors } from "@/constants/Colors";
import { Fonts } from "@/constants/Fonts";
import type { CrossRef } from "@/hooks/useBibleApi";

type Props = {
  verse: number | null;
  crossRefs: CrossRef[];
  onPressCrossRef: (crossRef: CrossRef) => void;
};

export function CrossRefFooter({ verse, crossRefs, onPressCrossRef }: Props) {
  if (verse === null || crossRefs.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cross References for verse {verse}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {crossRefs.map((cr, i) => (
          <TouchableOpacity
            key={`${cr.to_book}-${cr.to_chapter}-${cr.to_verse}-${i}`}
            style={styles.chip}
            onPress={() => onPressCrossRef(cr)}
            activeOpacity={0.7}
          >
            <Text style={styles.chipText}>
              {cr.book_name} {cr.to_chapter}:{cr.to_verse}
              {cr.to_end_verse ? `-${cr.to_end_verse}` : ""}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: KoinoniaColors.border,
    backgroundColor: KoinoniaColors.cream,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  title: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    color: KoinoniaColors.warmGray,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  scrollContent: {
    gap: 8,
  },
  chip: {
    backgroundColor: KoinoniaColors.warmWhite,
    borderWidth: 1,
    borderColor: KoinoniaColors.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: KoinoniaColors.secondary,
  },
});
