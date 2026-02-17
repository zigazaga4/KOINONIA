import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../server/convex/_generated/api";
import { ColorPickerRow } from "@/components/ColorPickerRow";
import { KoinoniaColors } from "@/constants/Colors";
import { Fonts } from "@/constants/Fonts";
import type { Doc } from "../../../server/convex/_generated/dataModel";

type Props = {
  visible: boolean;
  bookId: number;
  bookName: string;
  chapter: number;
  verse: number;
  verseText: string;
  existingNote?: Doc<"notes"> | null;
  onClose: () => void;
};

export function NoteEditor({
  visible,
  bookId,
  bookName,
  chapter,
  verse,
  verseText,
  existingNote,
  onClose,
}: Props) {
  const [content, setContent] = useState(existingNote?.content || "");
  const [color, setColor] = useState(existingNote?.color || "#C8902E");
  const createNote = useMutation(api.notes.create);
  const updateNote = useMutation(api.notes.update);

  const handleSave = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;

    if (existingNote) {
      await updateNote({ noteId: existingNote._id, content: trimmed, color });
    } else {
      await createNote({
        bookId,
        chapter,
        verse,
        content: trimmed,
        color,
        verseText,
        bookName,
      });
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {existingNote ? "Edit Note" : "Add Note"}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={styles.reference}>
              {bookName} {chapter}:{verse}
            </Text>
            <Text style={styles.verseText} numberOfLines={3}>
              {verseText}
            </Text>

            <ColorPickerRow selected={color} onSelect={setColor} />

            <TextInput
              style={styles.input}
              value={content}
              onChangeText={setContent}
              placeholder="Write your note..."
              placeholderTextColor={KoinoniaColors.warmGray}
              multiline
              autoFocus
              textAlignVertical="top"
            />
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveBtn, !content.trim() && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!content.trim()}
            >
              <Text style={styles.saveBtnText}>
                {existingNote ? "Update" : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: KoinoniaColors.warmWhite,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "80%",
    minHeight: 320,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: KoinoniaColors.divider,
  },
  title: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 18,
    color: KoinoniaColors.darkBrown,
  },
  cancelText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    color: KoinoniaColors.warmGray,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  reference: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: KoinoniaColors.primary,
    marginBottom: 4,
  },
  verseText: {
    fontFamily: Fonts.headingItalic,
    fontSize: 14,
    lineHeight: 22,
    color: KoinoniaColors.warmGray,
    marginBottom: 16,
  },
  input: {
    fontFamily: Fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: KoinoniaColors.darkBrown,
    borderWidth: 1,
    borderColor: KoinoniaColors.border,
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
    backgroundColor: KoinoniaColors.cardBg,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: KoinoniaColors.divider,
  },
  saveBtn: {
    backgroundColor: KoinoniaColors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 15,
    color: KoinoniaColors.lightText,
  },
});
