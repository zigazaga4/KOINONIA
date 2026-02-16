import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useState, useEffect } from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { KoinoniaColors } from "@/constants/Colors";
import { Fonts } from "@/constants/Fonts";
import { fetchVerseText } from "@/hooks/useBibleApi";
import type { CrossRef } from "@/hooks/useBibleApi";
import type { AnchorLayout } from "./BibleReader";

type Props = {
  crossRef: CrossRef;
  anchorLayout: AnchorLayout;
  containerOffset: { x: number; y: number };
  translation: string;
  onPress: (crossRef: CrossRef) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

const POPOVER_WIDTH = 320;

export function HoverPopover({
  crossRef,
  anchorLayout,
  containerOffset,
  translation,
  onPress,
  onMouseEnter,
  onMouseLeave,
}: Props) {
  const [verseText, setVerseText] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setVerseText("");
    fetchVerseText(
      translation,
      crossRef.to_book,
      crossRef.to_chapter,
      crossRef.to_verse
    )
      .then(setVerseText)
      .finally(() => setLoading(false));
  }, [crossRef, translation]);

  const reference = `${crossRef.book_name} ${crossRef.to_chapter}:${crossRef.to_verse}${
    crossRef.to_end_verse ? `-${crossRef.to_end_verse}` : ""
  }`;

  // Position relative to the container
  const left = Math.max(8, anchorLayout.pageX - containerOffset.x);
  const top = anchorLayout.pageY - containerOffset.y + anchorLayout.height + 6;

  return (
    <View
      style={[styles.popover, { left, top, maxWidth: POPOVER_WIDTH }]}
      // @ts-ignore — web-only events
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      pointerEvents="auto"
    >
      <View style={styles.header}>
        <Text style={styles.reference}>{reference}</Text>
      </View>

      <View style={styles.body}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={KoinoniaColors.primary}
            style={styles.loader}
          />
        ) : (
          <Text style={styles.verseText} numberOfLines={4}>
            {verseText || "Verse text not available in this translation."}
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.openBtn}
        onPress={() => onPress(crossRef)}
        activeOpacity={0.7}
      >
        <Text style={styles.openBtnText}>Open in split view</Text>
        <FontAwesome
          name="columns"
          size={12}
          color={KoinoniaColors.lightText}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  popover: {
    position: "absolute",
    zIndex: 1000,
    backgroundColor: KoinoniaColors.cardBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: KoinoniaColors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: "hidden",
  },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: KoinoniaColors.cream,
    borderBottomWidth: 1,
    borderBottomColor: KoinoniaColors.divider,
  },
  reference: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 14,
    color: KoinoniaColors.secondary,
  },
  body: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  loader: {
    marginVertical: 8,
  },
  verseText: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    lineHeight: 22,
    color: KoinoniaColors.darkBrown,
  },
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    backgroundColor: KoinoniaColors.primary,
    borderTopWidth: 1,
    borderTopColor: KoinoniaColors.divider,
  },
  openBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: KoinoniaColors.lightText,
  },
});
