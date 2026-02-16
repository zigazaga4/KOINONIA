import {
  View,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from "react-native";
import { useState, useEffect, useCallback, useRef } from "react";
import { NavigationBar } from "./NavigationBar";
import { VerseList } from "./VerseList";
import { CrossRefModal } from "./CrossRefModal";
import { HoverPopover } from "./HoverPopover";
import { useBibleApi } from "@/hooks/useBibleApi";
import { KoinoniaColors } from "@/constants/Colors";
import type { CrossRef } from "@/hooks/useBibleApi";

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

  const handleBookChange = useCallback((newBookId: number) => {
    setBookId(newBookId);
    setChapter(1);
    setSelectedVerse(null);
  }, []);

  const handleChapterChange = useCallback((newChapter: number) => {
    setChapter(newChapter);
    setSelectedVerse(null);
  }, []);

  const handleTranslationChange = useCallback((newTranslation: string) => {
    setTranslation(newTranslation);
    setSelectedVerse(null);
  }, []);

  const handleVersePress = useCallback((verse: number) => {
    setSelectedVerse((prev) => (prev === verse ? null : verse));
  }, []);

  const handleNavigate = useCallback(
    (targetBookId: number, targetChapter: number) => {
      setBookId(targetBookId);
      setChapter(targetChapter);
      setSelectedVerse(null);
    },
    []
  );

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
      // Re-measure container in case of scroll/resize
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
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={KoinoniaColors.primary} />
        </View>
      ) : (
        <VerseList
          verses={verses}
          crossRefsByVerse={crossRefsByVerse}
          selectedVerse={selectedVerse}
          onVersePress={handleVersePress}
          onCrossRefPress={handleCrossRefPress}
          onCrossRefHover={isDesktop ? handleCrossRefHover : undefined}
          onCrossRefHoverEnd={isDesktop ? handleCrossRefHoverEnd : undefined}
          onScrollBeginDrag={isDesktop ? handleScrollBegin : undefined}
        />
      )}

      {/* Desktop hover popover — rendered outside FlatList to avoid clipping */}
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

      {/* Mobile modal — kept for tap behavior */}
      <CrossRefModal
        visible={modalCrossRef !== null}
        crossRef={modalCrossRef}
        translation={translation}
        onClose={() => setModalCrossRef(null)}
        onNavigate={handleNavigate}
      />
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
