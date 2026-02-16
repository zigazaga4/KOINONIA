import { View, Text, TouchableOpacity, Platform, StyleSheet } from "react-native";
import { KoinoniaColors } from "@/constants/Colors";
import { Fonts } from "@/constants/Fonts";
import type { CrossRef } from "@/hooks/useBibleApi";
import type { AnchorLayout } from "./BibleReader";

type Props = {
  verse: { verse: number; text: string };
  crossRefs: CrossRef[];
  isSelected: boolean;
  onPress: () => void;
  onCrossRefPress: (crossRef: CrossRef) => void;
  onCrossRefHover?: (crossRef: CrossRef, layout: AnchorLayout) => void;
  onCrossRefHoverEnd?: () => void;
};

export function VerseItem({
  verse,
  crossRefs,
  isSelected,
  onPress,
  onCrossRefPress,
  onCrossRefHover,
  onCrossRefHoverEnd,
}: Props) {
  return (
    <TouchableOpacity
      style={[styles.container, isSelected && styles.selected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.number}>{verse.verse}</Text>
      <View style={styles.content}>
        <Text style={styles.text}>{verse.text}</Text>
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
      </View>
    </TouchableOpacity>
  );
}

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
});
