import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../server/convex/_generated/api";
import { BibleReader } from "@/components/bible/BibleReader";
import { ChatPanel } from "@/components/bible/ChatPanel";
import { ChatFAB } from "@/components/bible/ChatFAB";
import { DraggableDivider } from "@/components/bible/DraggableDivider";
import { PresentationCanvas } from "@/components/presentation/PresentationCanvas";
import { NotesTab } from "@/components/notes/NotesTab";
import { JournalTab } from "@/components/journal/JournalTab";
import { usePresentation } from "@/contexts/PresentationContext";
import { KoinoniaColors } from "@/constants/Colors";
import { Fonts } from "@/constants/Fonts";
import type { BibleContext } from "@/components/bible/BibleReader";
import type { PanelInfo, HighlightVerseData, CreateNoteData, JournalEntryData } from "@/hooks/useChatStream";

const DESKTOP_BREAKPOINT = 768;
const MIN_PANEL_PCT = 15;
const MAX_CHAT_PCT = 37;
const DEFAULT_READER_PCT = 65;
const MAX_SPLITS = 2;

type ActiveTab = "bible" | "presentation" | "notes" | "journal";

type SplitPanel = {
  id: string;
  bookId: number;
  chapter: number;
  fromCrossRef: boolean;
  translation?: string;
  label?: string;
};

let splitIdCounter = 0;

function ContentTabBar({
  activeTab,
  onChangeTab,
}: {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
}) {
  return (
    <View style={tabBarStyles.container}>
      <TouchableOpacity
        style={[
          tabBarStyles.tab,
          activeTab === "bible" && tabBarStyles.tabActive,
        ]}
        onPress={() => onChangeTab("bible")}
        activeOpacity={0.7}
      >
        <FontAwesome
          name="book"
          size={14}
          color={
            activeTab === "bible"
              ? KoinoniaColors.primary
              : KoinoniaColors.warmGray
          }
        />
        <Text
          style={[
            tabBarStyles.tabText,
            activeTab === "bible" && tabBarStyles.tabTextActive,
          ]}
        >
          Bible Study
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          tabBarStyles.tab,
          activeTab === "presentation" && tabBarStyles.tabActive,
        ]}
        onPress={() => onChangeTab("presentation")}
        activeOpacity={0.7}
      >
        <FontAwesome
          name="television"
          size={14}
          color={
            activeTab === "presentation"
              ? KoinoniaColors.primary
              : KoinoniaColors.warmGray
          }
        />
        <Text
          style={[
            tabBarStyles.tabText,
            activeTab === "presentation" && tabBarStyles.tabTextActive,
          ]}
        >
          Presentation
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          tabBarStyles.tab,
          activeTab === "notes" && tabBarStyles.tabActive,
        ]}
        onPress={() => onChangeTab("notes")}
        activeOpacity={0.7}
      >
        <FontAwesome
          name="sticky-note-o"
          size={14}
          color={
            activeTab === "notes"
              ? KoinoniaColors.primary
              : KoinoniaColors.warmGray
          }
        />
        <Text
          style={[
            tabBarStyles.tabText,
            activeTab === "notes" && tabBarStyles.tabTextActive,
          ]}
        >
          Notes
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          tabBarStyles.tab,
          activeTab === "journal" && tabBarStyles.tabActive,
        ]}
        onPress={() => onChangeTab("journal")}
        activeOpacity={0.7}
      >
        <FontAwesome
          name="pencil-square-o"
          size={14}
          color={
            activeTab === "journal"
              ? KoinoniaColors.primary
              : KoinoniaColors.warmGray
          }
        />
        <Text
          style={[
            tabBarStyles.tabText,
            activeTab === "journal" && tabBarStyles.tabTextActive,
          ]}
        >
          Journal
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function BibleScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;
  const { setDocumentPresentation, setSlidesPresentation, setPresentationFromSaved, presentation, hasContent } = usePresentation();
  const savePresentationMut = useMutation(api.presentations.save);
  const updatePresentationMut = useMutation(api.presentations.update);
  const createHighlightMut = useMutation(api.highlights.create);
  const createNoteMut = useMutation(api.notes.create);
  const createJournalMut = useMutation(api.journal.create);
  const savedPresentations = useQuery(api.presentations.list, {});
  const [activeTab, setActiveTab] = useState<ActiveTab>("bible");
  const [chatVisible, setChatVisible] = useState(false);
  const [splits, setSplits] = useState<SplitPanel[]>([]);
  const [readerPct, setReaderPct] = useState(DEFAULT_READER_PCT);

  // For navigating to a verse from Notes tab
  const [primaryNav, setPrimaryNav] = useState<{ bookId: number; chapter: number; key: number }>({
    bookId: 1, chapter: 1, key: 0,
  });

  // Track contexts from all panels by ID
  const [panelContexts, setPanelContexts] = useState<
    Record<string, BibleContext>
  >({});

  const handleContextChange = useCallback(
    (panelId: string, context: BibleContext) => {
      setPanelContexts((prev) => ({ ...prev, [panelId]: context }));
    },
    []
  );

  // Build lightweight panel info array for the chat
  const panels: PanelInfo[] = useMemo(() => {
    const result: PanelInfo[] = [];
    const primaryCtx = panelContexts["primary"];
    if (primaryCtx) {
      result.push({
        translation: primaryCtx.translation,
        bookName: primaryCtx.bookName,
        chapter: primaryCtx.chapter,
      });
    }
    for (const split of splits) {
      const ctx = panelContexts[split.id];
      if (ctx) {
        result.push({
          translation: ctx.translation,
          bookName: ctx.bookName,
          chapter: ctx.chapter,
        });
      }
    }
    return result;
  }, [panelContexts, splits]);

  // Build presentation summaries for the AI's list_presentations tool
  const presentationSummaries = useMemo(() => {
    if (!savedPresentations) return [];
    return savedPresentations.map((p: any) => ({
      id: p._id as string,
      title: p.title as string,
      mode: (p.mode as string) || "document",
    }));
  }, [savedPresentations]);

  const containerRef = useRef<View>(null);
  const containerLeftRef = useRef(0);

  const handleSplitNavigate = useCallback(
    (bookId: number, chapter: number, fromCrossRef = false) => {
      setSplits((prev) => {
        if (prev.length >= MAX_SPLITS) return prev;
        const id = `split-${++splitIdCounter}`;
        return [...prev, { id, bookId, chapter, fromCrossRef }];
      });
    },
    []
  );

  // Called by AI tool: open a new panel with a specific translation
  const handleOpenPanel = useCallback(
    (info: { translation: string; bookId: number; bookName: string; chapter: number }) => {
      // Switch to Bible tab when AI opens a panel
      setActiveTab("bible");
      setSplits((prev) => {
        if (prev.length >= MAX_SPLITS) {
          const id = `split-${++splitIdCounter}`;
          const replaced = prev.slice(0, -1);
          return [...replaced, { id, bookId: info.bookId, chapter: info.chapter, fromCrossRef: false, translation: info.translation, label: `${info.bookName} (${info.translation})` }];
        }
        const id = `split-${++splitIdCounter}`;
        return [...prev, { id, bookId: info.bookId, chapter: info.chapter, fromCrossRef: false, translation: info.translation, label: `${info.bookName} (${info.translation})` }];
      });
    },
    []
  );

  const handlePresentationUpdate = useCallback(
    async (data: { mode: string; title: string; html?: string; themeCss?: string; slides?: { title: string; html: string }[]; presentationId?: string }) => {
      // Show it immediately
      if (data.mode === "slides") {
        setSlidesPresentation(data.themeCss || "", data.slides || [], data.title);
      } else {
        setDocumentPresentation(data.html || "", data.title);
      }
      setActiveTab("presentation");

      // Persist to Convex
      try {
        // Determine which presentation to save to
        const targetId = data.presentationId === "new" ? null : (data.presentationId || presentation.savedId);

        if (targetId) {
          await updatePresentationMut({
            presentationId: targetId as any,
            title: data.title || undefined,
            mode: data.mode,
            html: data.html,
            themeCss: data.themeCss,
            slides: data.slides,
          });
          setPresentationFromSaved(targetId, {
            mode: data.mode,
            html: data.html,
            title: data.title || "Untitled Presentation",
            themeCss: data.themeCss,
            slides: data.slides,
          });
        } else {
          const id = await savePresentationMut({
            title: data.title || "Untitled Presentation",
            mode: data.mode,
            html: data.html,
            themeCss: data.themeCss,
            slides: data.slides,
          });
          setPresentationFromSaved(id, {
            mode: data.mode,
            html: data.html,
            title: data.title || "Untitled Presentation",
            themeCss: data.themeCss,
            slides: data.slides,
          });
        }
      } catch {
        // Silently fail — the presentation is still visible locally
      }
    },
    [setDocumentPresentation, setSlidesPresentation, setPresentationFromSaved, presentation.savedId, savePresentationMut, updatePresentationMut]
  );

  const handlePresentationStreaming = useCallback(
    (partialHtml: string) => {
      // Show partial HTML as it generates — switch to presentation tab on first chunk (document mode only)
      setDocumentPresentation(partialHtml);
      setActiveTab("presentation");
    },
    [setDocumentPresentation]
  );

  // Handle AI switching to a different saved presentation
  const handleSwitchPresentation = useCallback(
    (presentationId: string) => {
      if (!savedPresentations) return;
      const target = savedPresentations.find((p: any) => p._id === presentationId);
      if (target) {
        setPresentationFromSaved(presentationId, {
          mode: (target as any).mode,
          html: (target as any).html,
          title: target.title,
          themeCss: (target as any).themeCss,
          slides: (target as any).slides,
        });
        setActiveTab("presentation");
      }
    },
    [savedPresentations, setPresentationFromSaved]
  );

  const handleNavigateToVerse = useCallback((bookId: number, chapter: number) => {
    setPrimaryNav((prev) => ({ bookId, chapter, key: prev.key + 1 }));
    setActiveTab("bible");
  }, []);

  // AI tool: highlight a word range in a verse
  const handleHighlightVerse = useCallback(
    (data: HighlightVerseData) => {
      createHighlightMut({
        bookId: data.bookId,
        chapter: data.chapter,
        verse: data.verse,
        startWord: data.startWord,
        endWord: data.endWord,
        color: data.color,
      }).catch(() => {});
    },
    [createHighlightMut]
  );

  // AI tool: create a note on a verse
  const handleCreateNote = useCallback(
    (data: CreateNoteData) => {
      createNoteMut({
        bookId: data.bookId,
        chapter: data.chapter,
        verse: data.verse,
        content: data.content,
        color: data.color,
        verseText: data.verseText,
        bookName: data.bookName,
      }).catch(() => {});
    },
    [createNoteMut]
  );

  // AI tool: write a study journal entry
  const handleJournalEntry = useCallback(
    (data: JournalEntryData) => {
      createJournalMut({
        title: data.title,
        content: data.content,
        bookId: data.bookId,
        chapter: data.chapter,
        verse: data.verse,
        bookName: data.bookName,
      }).catch(() => {});
      // Switch to journal tab so the user sees the new entry
      setActiveTab("journal");
    },
    [createJournalMut]
  );

  const handleCloseSplit = useCallback((id: string) => {
    setSplits((prev) => prev.filter((s) => s.id !== id));
    setPanelContexts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const handleMainDividerDrag = useCallback(
    (pageX: number) => {
      const containerLeft = containerLeftRef.current;
      const pct = ((pageX - containerLeft) / width) * 100;
      setReaderPct(
        Math.max(100 - MAX_CHAT_PCT, Math.min(100 - MIN_PANEL_PCT, pct))
      );
    },
    [width]
  );

  const handleContainerLayout = useCallback(() => {
    if (containerRef.current) {
      const el = containerRef.current as unknown as HTMLElement;
      if (el.getBoundingClientRect) {
        containerLeftRef.current = el.getBoundingClientRect().left;
      }
    }
  }, []);

  const canSplit = splits.length < MAX_SPLITS;
  const splitNav = canSplit ? handleSplitNavigate : undefined;

  const bibleContent = (
    <View style={styles.splitContainer}>
      <View style={{ flex: 1 }}>
        <BibleReader
          key={`primary-${primaryNav.key}`}
          onContextChange={(ctx) => handleContextChange("primary", ctx)}
          isDesktop={isDesktop}
          onSplitNavigate={splitNav}
          initialBookId={primaryNav.bookId}
          initialChapter={primaryNav.chapter}
        />
      </View>

      {splits.map((split) => (
        <View key={split.id} style={{ flex: 1, flexDirection: "row" }}>
          <DraggableDivider onDrag={() => {}} />
          <View style={{ flex: 1 }}>
            <View style={styles.splitHeader}>
              {split.fromCrossRef ? (
                <Text style={styles.splitHeaderLabel}>Cross Reference</Text>
              ) : split.label ? (
                <Text style={styles.splitHeaderLabel}>{split.label}</Text>
              ) : (
                <View />
              )}
              <TouchableOpacity
                onPress={() => handleCloseSplit(split.id)}
                style={styles.splitCloseBtn}
              >
                <FontAwesome
                  name="times"
                  size={16}
                  color={KoinoniaColors.warmGray}
                />
              </TouchableOpacity>
            </View>
            <BibleReader
              key={`${split.id}-${split.bookId}-${split.chapter}-${split.translation || ""}`}
              onContextChange={(ctx) => handleContextChange(split.id, ctx)}
              isDesktop={isDesktop}
              onSplitNavigate={splitNav}
              initialBookId={split.bookId}
              initialChapter={split.chapter}
              initialTranslation={split.translation}
            />
          </View>
        </View>
      ))}
    </View>
  );

  if (isDesktop) {
    const chatPct = 100 - readerPct;

    return (
      <View
        ref={containerRef}
        style={styles.container}
        onLayout={handleContainerLayout}
      >
        <View style={styles.desktopRow}>
          <View style={{ flex: readerPct }}>
            <ContentTabBar activeTab={activeTab} onChangeTab={setActiveTab} />
            {activeTab === "bible" ? bibleContent : activeTab === "notes" ? <NotesTab onNavigateToVerse={handleNavigateToVerse} /> : activeTab === "journal" ? <JournalTab onNavigateToVerse={handleNavigateToVerse} /> : <PresentationCanvas />}
          </View>
          <DraggableDivider onDrag={handleMainDividerDrag} />
          <View style={{ flex: chatPct }}>
            <ChatPanel
              panels={panels}
              onOpenPanel={handleOpenPanel}
              onPresentationUpdate={handlePresentationUpdate}
              onPresentationStreaming={handlePresentationStreaming}
              onSwitchPresentation={handleSwitchPresentation}
              onHighlightVerse={handleHighlightVerse}
              onCreateNote={handleCreateNote}
              onJournalEntry={handleJournalEntry}
              presentation={hasContent ? { id: presentation.savedId || undefined, mode: presentation.mode, html: presentation.html || undefined, themeCss: presentation.themeCss || undefined, slides: presentation.slides.length > 0 ? presentation.slides : undefined } : undefined}
              presentationSummaries={presentationSummaries}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ContentTabBar activeTab={activeTab} onChangeTab={setActiveTab} />
      {activeTab === "bible" ? (
        <BibleReader
          key={`primary-mobile-${primaryNav.key}`}
          onContextChange={(ctx) => handleContextChange("primary", ctx)}
          initialBookId={primaryNav.bookId}
          initialChapter={primaryNav.chapter}
        />
      ) : activeTab === "notes" ? (
        <NotesTab onNavigateToVerse={handleNavigateToVerse} />
      ) : activeTab === "journal" ? (
        <JournalTab onNavigateToVerse={handleNavigateToVerse} />
      ) : (
        <PresentationCanvas />
      )}
      <ChatFAB onPress={() => setChatVisible(true)} />
      <ChatPanel
        panels={panels}
        isModal
        visible={chatVisible}
        onClose={() => setChatVisible(false)}
        onOpenPanel={handleOpenPanel}
        onPresentationUpdate={handlePresentationUpdate}
        onPresentationStreaming={handlePresentationStreaming}
        onSwitchPresentation={handleSwitchPresentation}
        onHighlightVerse={handleHighlightVerse}
        onCreateNote={handleCreateNote}
        onJournalEntry={handleJournalEntry}
        presentation={hasContent ? { id: presentation.savedId || undefined, mode: presentation.mode, html: presentation.html || undefined, themeCss: presentation.themeCss || undefined, slides: presentation.slides.length > 0 ? presentation.slides : undefined } : undefined}
        presentationSummaries={presentationSummaries}
      />
    </View>
  );
}

const tabBarStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: KoinoniaColors.cream,
    borderBottomWidth: 1,
    borderBottomColor: KoinoniaColors.divider,
    paddingHorizontal: 8,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: KoinoniaColors.primary,
  },
  tabText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: KoinoniaColors.warmGray,
  },
  tabTextActive: {
    color: KoinoniaColors.primary,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: KoinoniaColors.warmWhite,
  },
  desktopRow: {
    flex: 1,
    flexDirection: "row",
  },
  splitContainer: {
    flex: 1,
    flexDirection: "row",
  },
  splitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: KoinoniaColors.cream,
    borderBottomWidth: 1,
    borderBottomColor: KoinoniaColors.divider,
  },
  splitHeaderLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: KoinoniaColors.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  splitCloseBtn: {
    padding: 4,
  },
});
