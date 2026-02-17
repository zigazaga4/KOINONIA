import {
  View,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from "react-native";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../server/convex/_generated/api";
import { NavigationBar } from "./NavigationBar";
import { VerseList } from "./VerseList";
import { VerseActionBar } from "./VerseActionBar";
import { CrossRefModal } from "./CrossRefModal";
import { HoverPopover } from "./HoverPopover";
import { NoteEditor } from "../notes/NoteEditor";
import { useBibleApi } from "@/hooks/useBibleApi";
import { useHighlights } from "@/hooks/useHighlights";
import { KoinoniaColors } from "@/constants/Colors";
import type { CrossRef } from "@/hooks/useBibleApi";
import type { WordSelectionState } from "./VerseItem";
import type { Doc } from "../../../server/convex/_generated/dataModel";

export type AnchorLayout = {
  pageX: number;
  pageY: number;
  width: number;
  height: number;
};

export type BibleContext = {
  translation: string;
  bookId: number;
  bookName: string;
  chapter: number;
  verses: Array<{ verse: number; text: string }>;
  crossRefs: Array<{
    book_name: string;
    to_chapter: number;
    to_verse: number;
    text: string;
  }>;
};

type Props = {
  onContextChange: (context: BibleContext) => void;
  isDesktop?: boolean;
  onSplitNavigate?: (bookId: number, chapter: number, fromCrossRef?: boolean) => void;
  initialBookId?: number;
  initialChapter?: number;
  initialTranslation?: string;
};

export function BibleReader({
  onContextChange,
  isDesktop = false,
  onSplitNavigate,
  initialBookId = 1,
  initialChapter = 1,
  initialTranslation = "KJV",
}: Props) {
  const [translation, setTranslation] = useState(initialTranslation);
  const [bookId, setBookId] = useState(initialBookId);
  const [chapter, setChapter] = useState(initialChapter);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [modalCrossRef, setModalCrossRef] = useState<CrossRef | null>(null);

  // Highlight state
  const { highlightsByVerse, addHighlight, deleteHighlight } = useHighlights(bookId, chapter);
  const [wordSelection, setWordSelection] = useState<WordSelectionState | null>(null);
  const isHighlightMode = wordSelection !== null;

  // Notes for this chapter (verse indicators)
  const chapterNotes = useQuery(api.notes.listByChapter, { bookId, chapter });
  const noteVerses = useMemo(() => {
    const set = new Set<number>();
    if (chapterNotes) {
      for (const n of chapterNotes) set.add(n.verse);
    }
    return set;
  }, [chapterNotes]);

  // Note editor state
  const [noteEditorVisible, setNoteEditorVisible] = useState(false);
  const [noteEditorVerse, setNoteEditorVerse] = useState<number | null>(null);
  const [editingNote, setEditingNote] = useState<Doc<"notes"> | null>(null);

  // Hover popover state (desktop only)
  const [hoveredCrossRef, setHoveredCrossRef] = useState<CrossRef | null>(null);
  const [anchorLayout, setAnchorLayout] = useState<AnchorLayout | null>(null);
  const [containerOffset, setContainerOffset] = useState({ x: 0, y: 0 });
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<View>(null);

  const { translations, books, verses, crossRefsByVerse, loading } =
    useBibleApi(translation, bookId, chapter);

  useEffect(() => {
    if (verses.length > 0) {
      const book = books.find((b) => b.book_id === bookId);
      onContextChange({
        translation,
        bookId,
        bookName: book?.name || "",
        chapter,
        verses,
        crossRefs: [],
      });
    }
  }, [translation, bookId, chapter, verses]);

  const currentBookName = useMemo(
    () => books.find((b) => b.book_id === bookId)?.name || "",
    [books, bookId]
  );

  const handleBookChange = useCallback((newBookId: number) => {
    setBookId(newBookId);
    setChapter(1);
    setSelectedVerse(null);
    setWordSelection(null);
  }, []);

  const handleChapterChange = useCallback((newChapter: number) => {
    setChapter(newChapter);
    setSelectedVerse(null);
    setWordSelection(null);
  }, []);

  const handleTranslationChange = useCallback((newTranslation: string) => {
    setTranslation(newTranslation);
    setSelectedVerse(null);
    setWordSelection(null);
  }, []);

  const handleVersePress = useCallback((verse: number) => {
    if (verse === -1) {
      setSelectedVerse(null);
      setWordSelection(null);
    } else {
      setSelectedVerse((prev) => {
        if (prev === verse) {
          setWordSelection(null);
          return null;
        }
        setWordSelection(null);
        return verse;
      });
    }
  }, []);

  const handleNavigate = useCallback(
    (targetBookId: number, targetChapter: number) => {
      setBookId(targetBookId);
      setChapter(targetChapter);
      setSelectedVerse(null);
      setWordSelection(null);
    },
    []
  );

  // --- Highlight interaction ---
  const handleSelectColor = useCallback(
    (color: string) => {
      if (selectedVerse === null) return;
      setWordSelection({ verse: selectedVerse, color, startWord: null });
    },
    [selectedVerse]
  );

  const handleHighlightAll = useCallback(() => {
    if (selectedVerse === null) return;
    const verseData = verses.find((v) => v.verse === selectedVerse);
    if (!verseData) return;
    const wordCount = verseData.text.split(/\s+/).length;
    addHighlight(selectedVerse, 0, wordCount - 1, "#C8902E");
  }, [selectedVerse, verses, addHighlight]);

  const handleClearHighlights = useCallback(() => {
    if (selectedVerse === null) return;
    const verseHighlights = highlightsByVerse.get(selectedVerse);
    if (verseHighlights) {
      for (const h of verseHighlights) {
        deleteHighlight(h._id);
      }
    }
  }, [selectedVerse, highlightsByVerse, deleteHighlight]);

  const handleWordPress = useCallback(
    (verseNum: number, wordIndex: number) => {
      if (!wordSelection || wordSelection.verse !== verseNum) return;

      if (wordSelection.startWord === null) {
        // First tap — set start word
        setWordSelection({ ...wordSelection, startWord: wordIndex });
      } else {
        // Second tap — set end word and save
        const start = Math.min(wordSelection.startWord, wordIndex);
        const end = Math.max(wordSelection.startWord, wordIndex);
        addHighlight(verseNum, start, end, wordSelection.color);
        setWordSelection(null);
      }
    },
    [wordSelection, addHighlight]
  );

  const handleCancelWordSelection = useCallback(() => {
    setWordSelection(null);
  }, []);

  // --- Note interaction ---
  const handleAddNote = useCallback(() => {
    if (selectedVerse === null) return;
    // Check if there's an existing note for this verse
    const existing = chapterNotes?.find((n) => n.verse === selectedVerse) || null;
    setEditingNote(existing);
    setNoteEditorVerse(selectedVerse);
    setNoteEditorVisible(true);
  }, [selectedVerse, chapterNotes]);

  const handleCloseNoteEditor = useCallback(() => {
    setNoteEditorVisible(false);
    setNoteEditorVerse(null);
    setEditingNote(null);
  }, []);

  // Cross-ref press: desktop → split view, mobile → modal
  const handleCrossRefPress = useCallback(
    (cr: CrossRef) => {
      if (isDesktop && onSplitNavigate) {
        onSplitNavigate(cr.to_book, cr.to_chapter, true);
        setHoveredCrossRef(null);
        setAnchorLayout(null);
      } else {
        setModalCrossRef(cr);
      }
    },
    [isDesktop, onSplitNavigate]
  );

  // Hover popover handlers (desktop only)
  const handleContainerLayout = useCallback(() => {
    if (Platform.OS === "web" && containerRef.current) {
      const el = containerRef.current as unknown as HTMLElement;
      const rect = el.getBoundingClientRect();
      setContainerOffset({ x: rect.left, y: rect.top });
    }
  }, []);

  const handleCrossRefHover = useCallback(
    (crossRef: CrossRef, layout: AnchorLayout) => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      if (Platform.OS === "web" && containerRef.current) {
        const el = containerRef.current as unknown as HTMLElement;
        const rect = el.getBoundingClientRect();
        setContainerOffset({ x: rect.left, y: rect.top });
      }
      setHoveredCrossRef(crossRef);
      setAnchorLayout(layout);
    },
    []
  );

  const handleCrossRefHoverEnd = useCallback(() => {
    closeTimerRef.current = setTimeout(() => {
      setHoveredCrossRef(null);
      setAnchorLayout(null);
    }, 300);
  }, []);

  const handlePopoverMouseEnter = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const handlePopoverMouseLeave = useCallback(() => {
    closeTimerRef.current = setTimeout(() => {
      setHoveredCrossRef(null);
      setAnchorLayout(null);
    }, 200);
  }, []);

  const handlePopoverNavigate = useCallback(
    (cr: CrossRef) => {
      if (onSplitNavigate) {
        onSplitNavigate(cr.to_book, cr.to_chapter, true);
      }
      setHoveredCrossRef(null);
      setAnchorLayout(null);
    },
    [onSplitNavigate]
  );

  const handleScrollBegin = useCallback(() => {
    setHoveredCrossRef(null);
    setAnchorLayout(null);
  }, []);

  const selectedVerseData = selectedVerse !== null
    ? verses.find((v) => v.verse === selectedVerse)
    : null;

  return (
    <View
      ref={containerRef}
      style={styles.container}
      onLayout={handleContainerLayout}
    >
      <NavigationBar
        translations={translations}
        books={books}
        translation={translation}
        bookId={bookId}
        chapter={chapter}
        onTranslationChange={handleTranslationChange}
        onBookChange={handleBookChange}
        onChapterChange={handleChapterChange}
        onSplit={
          isDesktop && onSplitNavigate
            ? () => onSplitNavigate(bookId, chapter)
            : undefined
        }
      />

      {/* Verse action bar — appears when a verse is selected */}
      {selectedVerse !== null && (
        <VerseActionBar
          verse={selectedVerse}
          isHighlightMode={isHighlightMode}
          activeColor={wordSelection?.color || null}
          onSelectColor={handleSelectColor}
          onHighlightAll={handleHighlightAll}
          onClearHighlights={handleClearHighlights}
          onAddNote={handleAddNote}
          onCancel={handleCancelWordSelection}
        />
      )}

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={KoinoniaColors.primary} />
        </View>
      ) : (
        <VerseList
          verses={verses}
          crossRefsByVerse={crossRefsByVerse}
          highlightsByVerse={highlightsByVerse}
          noteVerses={noteVerses}
          selectedVerse={selectedVerse}
          isHighlightMode={isHighlightMode}
          wordSelection={wordSelection}
          onVersePress={handleVersePress}
          onCrossRefPress={handleCrossRefPress}
          onCrossRefHover={isDesktop ? handleCrossRefHover : undefined}
          onCrossRefHoverEnd={isDesktop ? handleCrossRefHoverEnd : undefined}
          onScrollBeginDrag={isDesktop ? handleScrollBegin : undefined}
          onWordPress={handleWordPress}
          onAddNote={handleAddNote}
        />
      )}

      {/* Desktop hover popover */}
      {isDesktop && hoveredCrossRef && anchorLayout && (
        <HoverPopover
          crossRef={hoveredCrossRef}
          anchorLayout={anchorLayout}
          containerOffset={containerOffset}
          translation={translation}
          onPress={handlePopoverNavigate}
          onMouseEnter={handlePopoverMouseEnter}
          onMouseLeave={handlePopoverMouseLeave}
        />
      )}

      {/* Mobile modal */}
      <CrossRefModal
        visible={modalCrossRef !== null}
        crossRef={modalCrossRef}
        translation={translation}
        onClose={() => setModalCrossRef(null)}
        onNavigate={handleNavigate}
      />

      {/* Note editor modal */}
      {noteEditorVisible && noteEditorVerse !== null && selectedVerseData && (
        <NoteEditor
          visible
          bookId={bookId}
          bookName={currentBookName}
          chapter={chapter}
          verse={noteEditorVerse}
          verseText={selectedVerseData.text}
          existingNote={editingNote}
          onClose={handleCloseNoteEditor}
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
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
