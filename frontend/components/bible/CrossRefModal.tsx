import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useState, useEffect } from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { KoinoniaColors } from "@/constants/Colors";
import { Fonts } from "@/constants/Fonts";
import { fetchVerseText } from "@/hooks/useBibleApi";
import type { CrossRef } from "@/hooks/useBibleApi";

type Props = {
  visible: boolean;
  crossRef: CrossRef | null;
  translation: string;
  onClose: () => void;
  onNavigate: (bookId: number, chapter: number) => void;
};

export function CrossRefModal({
  visible,
  crossRef,
  translation,
  onClose,
  onNavigate,
}: Props) {
  const [verseText, setVerseText] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && crossRef) {
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
    }
  }, [visible, crossRef, translation]);

  if (!crossRef) return null;

  const reference = `${crossRef.book_name} ${crossRef.to_chapter}:${crossRef.to_verse}${
    crossRef.to_end_verse ? `-${crossRef.to_end_verse}` : ""
  }`;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.reference}>{reference}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <FontAwesome
                name="times"
                size={18}
                color={KoinoniaColors.warmGray}
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body}>
            {loading ? (
              <ActivityIndicator
                size="small"
                color={KoinoniaColors.primary}
                style={styles.loader}
              />
            ) : (
              <Text style={styles.verseText}>
                {verseText ||
                  "Verse text not available in this translation."}
              </Text>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.goToBtn}
              onPress={() => {
                onNavigate(crossRef.to_book, crossRef.to_chapter);
                onClose();
              }}
            >
              <Text style={styles.goToBtnText}>Go to {reference}</Text>
              <FontAwesome
                name="arrow-right"
                size={14}
                color={KoinoniaColors.lightText}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "90%",
    maxWidth: 480,
    maxHeight: "60%",
    backgroundColor: KoinoniaColors.warmWhite,
    borderRadius: 12,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: KoinoniaColors.divider,
    backgroundColor: KoinoniaColors.cream,
  },
  reference: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 18,
    color: KoinoniaColors.secondary,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 20,
  },
  loader: {
    marginVertical: 20,
  },
  verseText: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    lineHeight: 30,
    color: KoinoniaColors.darkBrown,
  },
  footer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: KoinoniaColors.divider,
    alignItems: "center",
  },
  goToBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: KoinoniaColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  goToBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: KoinoniaColors.lightText,
  },
});
