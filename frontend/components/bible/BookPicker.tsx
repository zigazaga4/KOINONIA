import {
  View,
  Text,
  Modal,
  SectionList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useMemo } from "react";
import { KoinoniaColors } from "@/constants/Colors";
import { Fonts } from "@/constants/Fonts";
import type { Book } from "@/hooks/useBibleApi";

type Props = {
  visible: boolean;
  books: Book[];
  selectedBookId: number;
  onSelect: (bookId: number) => void;
  onClose: () => void;
};

const TESTAMENT_LABELS: Record<string, string> = {
  OT: "Old Testament",
  NT: "New Testament",
  DC: "Deuterocanonical",
  NC: "Non-Canonical",
};

export function BookPicker({
  visible,
  books,
  selectedBookId,
  onSelect,
  onClose,
}: Props) {
  const sections = useMemo(() => {
    const groups: Record<string, Book[]> = {};
    for (const book of books) {
      const key = book.testament;
      if (!groups[key]) groups[key] = [];
      groups[key].push(book);
    }
    return ["OT", "NT", "DC", "NC"]
      .filter((key) => groups[key]?.length)
      .map((key) => ({
        title: TESTAMENT_LABELS[key] || key,
        data: groups[key],
      }));
  }, [books]);

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Book</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>Done</Text>
            </TouchableOpacity>
          </View>
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.book_id.toString()}
            renderSectionHeader={({ section }) => (
              <Text style={styles.sectionHeader}>{section.title}</Text>
            )}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.item,
                  item.book_id === selectedBookId && styles.itemSelected,
                ]}
                onPress={() => {
                  onSelect(item.book_id);
                  onClose();
                }}
              >
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemChapters}>
                  {item.chapters} ch.
                </Text>
              </TouchableOpacity>
            )}
          />
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
    maxWidth: 400,
    maxHeight: "80%",
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
  },
  title: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 18,
    color: KoinoniaColors.darkBrown,
  },
  closeBtn: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 16,
    color: KoinoniaColors.primary,
  },
  sectionHeader: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: KoinoniaColors.warmGray,
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    backgroundColor: KoinoniaColors.cream,
  },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: KoinoniaColors.divider,
  },
  itemSelected: {
    backgroundColor: KoinoniaColors.sand,
  },
  itemName: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: KoinoniaColors.darkBrown,
  },
  itemChapters: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: KoinoniaColors.warmGray,
  },
});
