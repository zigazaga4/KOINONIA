import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { ColorPickerRow } from "@/components/ColorPickerRow";
import { KoinoniaColors } from "@/constants/Colors";
import { Fonts } from "@/constants/Fonts";

type Props = {
  verse: number;
  isHighlightMode: boolean;
  activeColor: string | null;
  onSelectColor: (color: string) => void;
  onHighlightAll: () => void;
  onClearHighlights: () => void;
  onAddNote: () => void;
  onCancel: () => void;
};

export function VerseActionBar({
  verse,
  isHighlightMode,
  activeColor,
  onSelectColor,
  onHighlightAll,
  onClearHighlights,
  onAddNote,
  onCancel,
}: Props) {
  if (isHighlightMode) {
    return (
      <View style={styles.container}>
        <Text style={styles.instruction}>
          Tap first word, then last word
        </Text>
        <TouchableOpacity style={styles.actionBtn} onPress={onCancel}>
          <Text style={styles.actionBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ColorPickerRow selected={activeColor} onSelect={onSelectColor} />
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={onHighlightAll}>
          <FontAwesome name="paint-brush" size={12} color={KoinoniaColors.primary} />
          <Text style={styles.actionBtnText}>Highlight All</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={onAddNote}>
          <FontAwesome name="sticky-note-o" size={12} color={KoinoniaColors.primary} />
          <Text style={styles.actionBtnText}>Note</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={onClearHighlights}>
          <FontAwesome name="eraser" size={12} color={KoinoniaColors.error} />
          <Text style={[styles.actionBtnText, { color: KoinoniaColors.error }]}>Clear</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: KoinoniaColors.cream,
    borderTopWidth: 1,
    borderTopColor: KoinoniaColors.divider,
    borderBottomWidth: 1,
    borderBottomColor: KoinoniaColors.divider,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: KoinoniaColors.warmWhite,
    borderWidth: 1,
    borderColor: KoinoniaColors.border,
  },
  actionBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: KoinoniaColors.primary,
  },
  instruction: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    color: KoinoniaColors.warmGray,
    textAlign: "center",
  },
});
