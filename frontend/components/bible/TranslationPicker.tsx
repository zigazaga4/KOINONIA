import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from "react-native";
import { useState, useMemo } from "react";
import { KoinoniaColors } from "@/constants/Colors";
import { Fonts } from "@/constants/Fonts";
import type { Translation } from "@/hooks/useBibleApi";

type Props = {
  visible: boolean;
  translations: Translation[];
  selected: string;
  onSelect: (shortName: string) => void;
  onClose: () => void;
};

export function TranslationPicker({
  visible,
  translations,
  selected,
  onSelect,
  onClose,
}: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return translations;
    const q = search.toLowerCase();
    return translations.filter(
      (t) =>
        t.short_name.toLowerCase().includes(q) ||
        t.full_name.toLowerCase().includes(q) ||
        t.language.toLowerCase().includes(q)
    );
  }, [translations, search]);

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Translation</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>Done</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search translations..."
            placeholderTextColor={KoinoniaColors.warmGray}
            value={search}
            onChangeText={setSearch}
          />
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.short_name}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.item,
                  item.short_name === selected && styles.itemSelected,
                ]}
                onPress={() => {
                  onSelect(item.short_name);
                  onClose();
                }}
              >
                <Text style={styles.itemCode}>{item.short_name}</Text>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.full_name}
                  </Text>
                  <Text style={styles.itemLang}>{item.language}</Text>
                </View>
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
    maxWidth: 500,
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
  searchInput: {
    margin: 12,
    padding: 10,
    backgroundColor: KoinoniaColors.cream,
    borderRadius: 8,
    fontFamily: Fonts.body,
    fontSize: 15,
    color: KoinoniaColors.darkBrown,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: KoinoniaColors.divider,
  },
  itemSelected: {
    backgroundColor: KoinoniaColors.sand,
  },
  itemCode: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: KoinoniaColors.primary,
    width: 60,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: KoinoniaColors.darkBrown,
  },
  itemLang: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: KoinoniaColors.warmGray,
  },
});
