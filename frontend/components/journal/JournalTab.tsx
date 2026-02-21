import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
} from "react-native";
import { useState, useCallback } from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import Markdown from "react-native-markdown-display";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../server/convex/_generated/api";
import { KoinoniaColors } from "@/constants/Colors";
import { Fonts } from "@/constants/Fonts";
import type { Doc } from "../../../server/convex/_generated/dataModel";

type EntryDoc = Doc<"journalEntries">;

type Props = {
  onNavigateToVerse: (bookId: number, chapter: number) => void;
};

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const mdStyles: Record<string, any> = {
  body: {
    fontFamily: Fonts.body,
    fontSize: 15,
    lineHeight: 24,
    color: KoinoniaColors.darkBrown,
  },
  heading1: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 22,
    color: KoinoniaColors.darkBrown,
    marginTop: 16,
    marginBottom: 8,
  },
  heading2: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 19,
    color: KoinoniaColors.darkBrown,
    marginTop: 12,
    marginBottom: 6,
  },
  heading3: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 16,
    color: KoinoniaColors.darkBrown,
    marginTop: 10,
    marginBottom: 4,
  },
  strong: {
    fontFamily: Fonts.bodySemiBold,
  },
  em: {
    fontFamily: Fonts.headingItalic,
  },
  blockquote: {
    backgroundColor: KoinoniaColors.cream,
    borderLeftWidth: 3,
    borderLeftColor: KoinoniaColors.primary,
    paddingLeft: 12,
    paddingVertical: 4,
    marginVertical: 8,
  },
  list_item: {
    marginBottom: 4,
  },
  hr: {
    backgroundColor: KoinoniaColors.divider,
    height: 1,
    marginVertical: 16,
  },
};

export function JournalTab({ onNavigateToVerse }: Props) {
  const entries = useQuery(api.journal.list, {});
  const removeEntry = useMutation(api.journal.remove);
  const updateEntry = useMutation(api.journal.update);
  const [editingEntry, setEditingEntry] = useState<EntryDoc | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  const handleDelete = useCallback(
    (entry: EntryDoc) => {
      if (Platform.OS === "web") {
        if (confirm("Delete this journal entry?")) {
          removeEntry({ entryId: entry._id });
        }
      } else {
        Alert.alert("Delete Entry", "Are you sure?", [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => removeEntry({ entryId: entry._id }),
          },
        ]);
      }
    },
    [removeEntry]
  );

  const handleEdit = useCallback((entry: EntryDoc) => {
    setEditingEntry(entry);
    setEditTitle(entry.title);
    setEditContent(entry.content);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingEntry) return;
    const trimmedTitle = editTitle.trim();
    const trimmedContent = editContent.trim();
    if (!trimmedTitle || !trimmedContent) return;
    await updateEntry({
      entryId: editingEntry._id,
      title: trimmedTitle,
      content: trimmedContent,
    });
    setEditingEntry(null);
  }, [editingEntry, editTitle, editContent, updateEntry]);

  if (entries === undefined) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Loading...</Text>
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View style={styles.empty}>
        <FontAwesome name="book" size={40} color={KoinoniaColors.border} />
        <Text style={styles.emptyTitle}>Your Study Journal</Text>
        <Text style={styles.emptyText}>
          Ask the AI to write a journal entry about what you're studying.{"\n"}
          Say something like "journal this study" or "write this to my journal."
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Book header */}
      <View style={styles.bookHeader}>
        <Text style={styles.bookTitle}>Study Journal</Text>
        <Text style={styles.bookSubtitle}>
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
      >
        {entries.map((entry, index) => {
          const verseStr = entry.verse ? `:${entry.verse}` : "";
          const ref = `${entry.bookName} ${entry.chapter}${verseStr}`;

          return (
            <View key={entry._id} style={styles.entry}>
              {/* Entry number + date (like a chapter header) */}
              <View style={styles.entryHeader}>
                <Text style={styles.entryNumber}>
                  {String(index + 1).padStart(2, "0")}
                </Text>
                <Text style={styles.entryDate}>
                  {formatDate(entry.createdAt)}
                </Text>
              </View>

              {/* Title */}
              <Text style={styles.entryTitle}>{entry.title}</Text>

              {/* Verse reference */}
              <TouchableOpacity
                onPress={() => onNavigateToVerse(entry.bookId, entry.chapter)}
                style={styles.refBtn}
              >
                <FontAwesome
                  name="book"
                  size={11}
                  color={KoinoniaColors.primary}
                />
                <Text style={styles.refText}>{ref}</Text>
              </TouchableOpacity>

              {/* Markdown content */}
              <View style={styles.entryBody}>
                <Markdown style={mdStyles}>{entry.content}</Markdown>
              </View>

              {/* Actions */}
              <View style={styles.entryActions}>
                <TouchableOpacity
                  onPress={() => handleEdit(entry)}
                  style={styles.actionBtn}
                >
                  <FontAwesome
                    name="pencil"
                    size={12}
                    color={KoinoniaColors.warmGray}
                  />
                  <Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(entry)}
                  style={styles.actionBtn}
                >
                  <FontAwesome
                    name="trash-o"
                    size={12}
                    color={KoinoniaColors.error}
                  />
                  <Text style={[styles.actionText, { color: KoinoniaColors.error }]}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Separator between entries */}
              {index < entries.length - 1 && (
                <View style={styles.separator}>
                  <View style={styles.separatorLine} />
                  <FontAwesome
                    name="diamond"
                    size={6}
                    color={KoinoniaColors.border}
                  />
                  <View style={styles.separatorLine} />
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Edit modal */}
      {editingEntry && (
        <Modal visible transparent animationType="slide">
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Entry</Text>
                <TouchableOpacity onPress={() => setEditingEntry(null)}>
                  <Text style={styles.modalCancel}>Cancel</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalBody}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.modalLabel}>Title</Text>
                <TextInput
                  style={styles.modalTitleInput}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Entry title..."
                  placeholderTextColor={KoinoniaColors.warmGray}
                />
                <Text style={styles.modalLabel}>Content (Markdown)</Text>
                <TextInput
                  style={styles.modalContentInput}
                  value={editContent}
                  onChangeText={setEditContent}
                  placeholder="Write your journal entry..."
                  placeholderTextColor={KoinoniaColors.warmGray}
                  multiline
                  textAlignVertical="top"
                />
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[
                    styles.saveBtn,
                    (!editTitle.trim() || !editContent.trim()) &&
                      styles.saveBtnDisabled,
                  ]}
                  onPress={handleSaveEdit}
                  disabled={!editTitle.trim() || !editContent.trim()}
                >
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: KoinoniaColors.warmWhite,
  },
  bookHeader: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: KoinoniaColors.divider,
    backgroundColor: KoinoniaColors.cream,
  },
  bookTitle: {
    fontFamily: Fonts.heading,
    fontSize: 26,
    color: KoinoniaColors.darkBrown,
  },
  bookSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: KoinoniaColors.warmGray,
    marginTop: 4,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  entry: {
    marginBottom: 8,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  entryNumber: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    color: KoinoniaColors.border,
    letterSpacing: 1,
  },
  entryDate: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: KoinoniaColors.warmGray,
  },
  entryTitle: {
    fontFamily: Fonts.heading,
    fontSize: 22,
    lineHeight: 30,
    color: KoinoniaColors.darkBrown,
    marginBottom: 6,
  },
  refBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
    backgroundColor: KoinoniaColors.cream,
    marginBottom: 16,
  },
  refText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: KoinoniaColors.primary,
  },
  entryBody: {
    marginBottom: 12,
  },
  entryActions: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 20,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: KoinoniaColors.cardBg,
    borderWidth: 1,
    borderColor: KoinoniaColors.divider,
  },
  actionText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    color: KoinoniaColors.warmGray,
  },
  separator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 20,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: KoinoniaColors.divider,
  },
  // Empty state
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 18,
    color: KoinoniaColors.darkBrown,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: KoinoniaColors.warmGray,
    textAlign: "center",
    lineHeight: 22,
  },
  // Edit modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: KoinoniaColors.warmWhite,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "85%",
    minHeight: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: KoinoniaColors.divider,
  },
  modalTitle: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 18,
    color: KoinoniaColors.darkBrown,
  },
  modalCancel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    color: KoinoniaColors.warmGray,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modalLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: KoinoniaColors.warmGray,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modalTitleInput: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    color: KoinoniaColors.darkBrown,
    borderWidth: 1,
    borderColor: KoinoniaColors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: KoinoniaColors.cardBg,
  },
  modalContentInput: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 22,
    color: KoinoniaColors.darkBrown,
    borderWidth: 1,
    borderColor: KoinoniaColors.border,
    borderRadius: 8,
    padding: 12,
    minHeight: 200,
    backgroundColor: KoinoniaColors.cardBg,
  },
  modalFooter: {
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
