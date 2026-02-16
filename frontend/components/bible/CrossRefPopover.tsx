import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { KoinoniaColors } from "@/constants/Colors";
import { Fonts } from "@/constants/Fonts";
import type { CrossRef } from "@/hooks/useBibleApi";

type Props = {
  crossRefs: CrossRef[];
  onNavigate: (bookId: number, chapter: number) => void;
};

export function CrossRefPopover({ crossRefs, onNavigate }: Props) {
  if (crossRefs.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cross References</Text>
      {crossRefs.map((cr, i) => (
        <TouchableOpacity
          key={`${cr.to_book}-${cr.to_chapter}-${cr.to_verse}-${i}`}
          style={styles.refItem}
          onPress={() => onNavigate(cr.to_book, cr.to_chapter)}
          activeOpacity={0.7}
        >
          <Text style={styles.refLabel}>
            {cr.book_name} {cr.to_chapter}:{cr.to_verse}
            {cr.to_end_verse ? `-${cr.to_end_verse}` : ""}
          </Text>
          <Text style={styles.refText} numberOfLines={2}>
            {cr.text}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: KoinoniaColors.cardBg,
    borderWidth: 1,
    borderColor: KoinoniaColors.border,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
  },
  title: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: KoinoniaColors.warmGray,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  refItem: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: KoinoniaColors.divider,
  },
  refLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: KoinoniaColors.secondary,
    marginBottom: 2,
  },
  refText: {
    fontFamily: Fonts.headingItalic,
    fontSize: 14,
    lineHeight: 20,
    color: KoinoniaColors.warmGray,
  },
});
