import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useState } from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { KoinoniaColors } from "@/constants/Colors";
import { Fonts } from "@/constants/Fonts";
import { TranslationPicker } from "./TranslationPicker";
import { BookPicker } from "./BookPicker";
import { ChapterPicker } from "./ChapterPicker";
import type { Translation, Book } from "@/hooks/useBibleApi";

type Props = {
  translations: Translation[];
  books: Book[];
  translation: string;
  bookId: number;
  chapter: number;
  onTranslationChange: (t: string) => void;
  onBookChange: (bookId: number) => void;
  onChapterChange: (chapter: number) => void;
  onSplit?: () => void;
};

export function NavigationBar({
  translations,
  books,
  translation,
  bookId,
  chapter,
  onTranslationChange,
  onBookChange,
  onChapterChange,
  onSplit,
}: Props) {
  const [showTranslations, setShowTranslations] = useState(false);
  const [showBooks, setShowBooks] = useState(false);
  const [showChapters, setShowChapters] = useState(false);

  const currentBook = books.find((b) => b.book_id === bookId);
  const bookName = currentBook?.name || "Genesis";
  const totalChapters = currentBook?.chapters || 50;

  return (
    <>
      <View style={styles.bar}>
        <TouchableOpacity
          style={styles.selector}
          onPress={() => setShowTranslations(true)}
        >
          <Text style={styles.selectorText}>{translation}</Text>
          <FontAwesome name="caret-down" size={12} color={KoinoniaColors.warmGray} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.selector, styles.bookSelector]}
          onPress={() => setShowBooks(true)}
        >
          <Text style={styles.bookText} numberOfLines={1}>
            {bookName}
          </Text>
          <FontAwesome name="caret-down" size={12} color={KoinoniaColors.warmGray} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.selector}
          onPress={() => setShowChapters(true)}
        >
          <Text style={styles.selectorText}>{chapter}</Text>
          <FontAwesome name="caret-down" size={12} color={KoinoniaColors.warmGray} />
        </TouchableOpacity>

        {onSplit && (
          <TouchableOpacity style={styles.splitBtn} onPress={onSplit}>
            <FontAwesome name="plus" size={14} color={KoinoniaColors.lightText} />
          </TouchableOpacity>
        )}
      </View>

      <TranslationPicker
        visible={showTranslations}
        translations={translations}
        selected={translation}
        onSelect={onTranslationChange}
        onClose={() => setShowTranslations(false)}
      />
      <BookPicker
        visible={showBooks}
        books={books}
        selectedBookId={bookId}
        onSelect={onBookChange}
        onClose={() => setShowBooks(false)}
      />
      <ChapterPicker
        visible={showChapters}
        totalChapters={totalChapters}
        selectedChapter={chapter}
        onSelect={onChapterChange}
        onClose={() => setShowChapters(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: KoinoniaColors.cream,
    borderBottomWidth: 1,
    borderBottomColor: KoinoniaColors.divider,
    gap: 8,
  },
  selector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: KoinoniaColors.warmWhite,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: KoinoniaColors.border,
  },
  bookSelector: {
    flex: 1,
  },
  selectorText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: KoinoniaColors.darkBrown,
  },
  bookText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: KoinoniaColors.darkBrown,
    flex: 1,
  },
  splitBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: KoinoniaColors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
