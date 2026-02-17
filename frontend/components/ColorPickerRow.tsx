import { View, Text, TouchableOpacity, Modal, Platform, StyleSheet } from "react-native";
import { useState, useCallback, useEffect } from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import ColorPicker, {
  HueSlider,
  Panel1,
  Preview,
} from "reanimated-color-picker";
import { HighlightColors } from "@/constants/HighlightColors";
import { KoinoniaColors } from "@/constants/Colors";
import { Fonts } from "@/constants/Fonts";

const STORAGE_KEY = "koinonia_palette";

function loadPalette(): string[] {
  try {
    if (Platform.OS === "web" && typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length === HighlightColors.length) return arr;
      }
    }
  } catch {}
  return HighlightColors.map((c) => c.hex);
}

function savePalette(palette: string[]) {
  try {
    if (Platform.OS === "web" && typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(palette));
    }
  } catch {}
}

type Props = {
  selected: string | null;
  onSelect: (hex: string) => void;
};

export function ColorPickerRow({ selected, onSelect }: Props) {
  const [palette, setPalette] = useState<string[]>(loadPalette);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [pendingColor, setPendingColor] = useState("#C8902E");

  useEffect(() => {
    savePalette(palette);
  }, [palette]);

  const handlePickerComplete = useCallback(
    ({ hex }: { hex: string }) => {
      setPendingColor(hex);
    },
    []
  );

  const handleConfirm = useCallback(() => {
    if (editingIndex !== null) {
      // Replacing a palette slot
      setPalette((prev) => {
        const next = [...prev];
        next[editingIndex] = pendingColor;
        return next;
      });
      onSelect(pendingColor);
    }
    setPickerOpen(false);
    setEditingIndex(null);
  }, [pendingColor, editingIndex, onSelect]);

  const openEditor = (index: number) => {
    setEditingIndex(index);
    setPendingColor(palette[index]);
    setPickerOpen(true);
  };

  return (
    <>
      <View style={styles.row}>
        {palette.map((hex, i) => (
          <View key={i} style={styles.slotWrap}>
            <TouchableOpacity
              style={[
                styles.circle,
                { backgroundColor: hex },
                selected === hex && styles.circleActive,
              ]}
              onPress={() => onSelect(hex)}
            />
            <TouchableOpacity
              style={styles.editBadge}
              onPress={() => openEditor(i)}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <FontAwesome name="pencil" size={7} color={KoinoniaColors.warmWhite} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <Modal visible={pickerOpen} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Pick a Color</Text>
            <ColorPicker
              style={styles.picker}
              value={pendingColor}
              onComplete={handlePickerComplete}
            >
              <Preview style={styles.preview} />
              <Panel1 style={styles.panel} />
              <HueSlider style={styles.slider} />
            </ColorPicker>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtn}
                onPress={() => {
                  setPickerOpen(false);
                  setEditingIndex(null);
                }}
              >
                <Text style={styles.modalBtnTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnConfirm]}
                onPress={handleConfirm}
              >
                <Text style={styles.modalBtnTextConfirm}>Use Color</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  slotWrap: {
    position: "relative",
    width: 30,
    height: 30,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "transparent",
  },
  circleActive: {
    borderColor: KoinoniaColors.darkBrown,
  },
  editBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: KoinoniaColors.warmGray,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: KoinoniaColors.warmWhite,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modal: {
    backgroundColor: KoinoniaColors.warmWhite,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    gap: 16,
  },
  modalTitle: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 18,
    color: KoinoniaColors.darkBrown,
    textAlign: "center",
  },
  picker: {
    gap: 16,
  },
  preview: {
    height: 40,
    borderRadius: 8,
  },
  panel: {
    height: 180,
    borderRadius: 8,
  },
  slider: {
    height: 28,
    borderRadius: 8,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: KoinoniaColors.border,
  },
  modalBtnConfirm: {
    backgroundColor: KoinoniaColors.primary,
    borderColor: KoinoniaColors.primary,
  },
  modalBtnTextCancel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: KoinoniaColors.warmGray,
  },
  modalBtnTextConfirm: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: KoinoniaColors.lightText,
  },
});
