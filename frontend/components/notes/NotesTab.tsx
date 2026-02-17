import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { useMemo, useState } from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../server/convex/_generated/api";
import { KoinoniaColors } from "@/constants/Colors";
import { Fonts } from "@/constants/Fonts";
import { NoteEditor } from "./NoteEditor";
import type { Doc } from "../../../server/convex/_generated/dataModel";

type Props = {
  onNavigateToVerse: (bookId: number, chapter: number) => void;
};

type NoteDoc = Doc<"notes">;

export function NotesTab({ onNavigateToVerse }: Props) {
  const notes = useQuery(api.notes.list, {});
  const removeNote = useMutation(api.notes.remove);
  const [editingNote, setEditingNote] = useState<NoteDoc | null>(null);

  // Group notes by bookName + chapter
  const grouped = useMemo(() => {
    if (!notes) return [];
    const map = new Map<string, { label: string; notes: NoteDoc[] }>();
    for (const note of notes) {
      const key = `${note.bookName}-${note.chapter}`;
      if (!map.has(key)) {
        map.set(key, { label: `${note.bookName} ${note.chapter}`, notes: [] });
      }
      map.get(key)!.notes.push(note);
    }
    return Array.from(map.values());
  }, [notes]);

  const handleDelete = (note: NoteDoc) => {
    if (Platform.OS === "web") {
      if (confirm("Delete this note?")) {
        removeNote({ noteId: note._id });
      }
    } else {
      Alert.alert("Delete Note", "Are you sure?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => removeNote({ noteId: note._id }),
        },
      ]);
    }
  };

  if (notes === undefined) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Loading...</Text>
      </View>
    );
  }

  if (notes.length === 0) {
    return (
      <View style={styles.empty}>
        <FontAwesome name="sticky-note-o" size={40} color={KoinoniaColors.border} />
        <Text style={styles.emptyTitle}>No Notes Yet</Text>
        <Text style={styles.emptyText}>
          Select a verse while reading and tap "Note" to add your first note.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={grouped}
        keyExtractor={(item) => item.label}
        renderItem={({ item: group }) => (
          <View style={styles.group}>
            <Text style={styles.groupLabel}>{group.label}</Text>
            {group.notes.map((note) => {
              return (
                <TouchableOpacity
                  key={note._id}
                  style={[
                    styles.card,
                    note.color && { borderLeftColor: note.color },
                  ]}
                  onPress={() => onNavigateToVerse(note.bookId, note.chapter)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardRef}>
                      {note.bookName} {note.chapter}:{note.verse}
                    </Text>
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        onPress={() => setEditingNote(note)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <FontAwesome name="pencil" size={13} color={KoinoniaColors.warmGray} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDelete(note)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <FontAwesome name="trash-o" size={13} color={KoinoniaColors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.cardVerse} numberOfLines={2}>
                    {note.verseText}
                  </Text>
                  <Text style={styles.cardContent}>{note.content}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />

      {editingNote && (
        <NoteEditor
          visible
          bookId={editingNote.bookId}
          bookName={editingNote.bookName}
          chapter={editingNote.chapter}
          verse={editingNote.verse}
          verseText={editingNote.verseText}
          existingNote={editingNote}
          onClose={() => setEditingNote(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: KoinoniaColors.warmWhite,
  },
  listContent: {
    padding: 16,
  },
  group: {
    marginBottom: 20,
  },
  groupLabel: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 15,
    color: KoinoniaColors.secondary,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: KoinoniaColors.cardBg,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: KoinoniaColors.primary,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: KoinoniaColors.divider,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  cardRef: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: KoinoniaColors.primary,
  },
  cardActions: {
    flexDirection: "row",
    gap: 14,
  },
  cardVerse: {
    fontFamily: Fonts.headingItalic,
    fontSize: 13,
    lineHeight: 20,
    color: KoinoniaColors.warmGray,
    marginBottom: 8,
  },
  cardContent: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: KoinoniaColors.darkBrown,
  },
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
  },
});
