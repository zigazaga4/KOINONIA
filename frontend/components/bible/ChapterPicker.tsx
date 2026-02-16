import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { KoinoniaColors } from "@/constants/Colors";
import { Fonts } from "@/constants/Fonts";

type Props = {
  visible: boolean;
  totalChapters: number;
  selectedChapter: number;
  onSelect: (chapter: number) => void;
  onClose: () => void;
};

export function ChapterPicker({
  visible,
  totalChapters,
  selectedChapter,
  onSelect,
  onClose,
}: Props) {
  const chapters = Array.from({ length: totalChapters }, (_, i) => i + 1);

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Chapter</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>Done</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={chapters}
            numColumns={6}
            keyExtractor={(item) => item.toString()}
            contentContainerStyle={styles.grid}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.cell,
                  item === selectedChapter && styles.cellSelected,
                ]}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <Text
                  style={[
                    styles.cellText,
                    item === selectedChapter && styles.cellTextSelected,
                  ]}
                >
                  {item}
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
    maxWidth: 360,
    maxHeight: "70%",
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
  grid: {
    padding: 12,
  },
  cell: {
    flex: 1,
    maxWidth: "16.66%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    margin: 4,
    borderRadius: 8,
    backgroundColor: KoinoniaColors.cream,
  },
  cellSelected: {
    backgroundColor: KoinoniaColors.primary,
  },
  cellText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 15,
    color: KoinoniaColors.darkBrown,
  },
  cellTextSelected: {
    color: KoinoniaColors.lightText,
  },
});
