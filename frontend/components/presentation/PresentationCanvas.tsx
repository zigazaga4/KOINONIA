import { View, Text, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from "react-native";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { usePresentation } from "@/contexts/PresentationContext";
import { PresentationList } from "./PresentationList";
import { KoinoniaColors } from "@/constants/Colors";
import { Fonts } from "@/constants/Fonts";
import type { Id } from "../../../server/convex/_generated/dataModel";

type SlideData = { title: string; html: string };

export function PresentationCanvas() {
  const { presentation, hasContent, setPresentationFromSaved, setCurrentSlide, clearPresentation } = usePresentation();
  const [showHistory, setShowHistory] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleExportPdf = useCallback(() => {
    setShowExportMenu(false);
    if (!presentation.html) return;
    import("@/utils/presentationExport").then(({ exportDocumentPdf }) => {
      exportDocumentPdf(presentation.html, presentation.title || "Presentation");
    });
  }, [presentation.html, presentation.title]);

  const handleExportPptx = useCallback(async () => {
    setShowExportMenu(false);
    setIsExporting(true);
    setExportProgress("Preparing...");
    try {
      const { exportSlidesPptx } = await import("@/utils/presentationExport");
      await exportSlidesPptx(
        presentation.slides,
        presentation.themeCss,
        presentation.title || "Presentation",
        (current, total) => setExportProgress(`Rendering slide ${current}/${total}...`),
      );
    } catch {
      setExportProgress("Export failed");
      await new Promise((r) => setTimeout(r, 1500));
    } finally {
      setIsExporting(false);
      setExportProgress("");
    }
  }, [presentation.slides, presentation.themeCss, presentation.title]);

  const handleExportImages = useCallback(async () => {
    setShowExportMenu(false);
    setIsExporting(true);
    setExportProgress("Preparing...");
    try {
      const { exportSlidesImages } = await import("@/utils/presentationExport");
      await exportSlidesImages(
        presentation.slides,
        presentation.themeCss,
        presentation.title || "Presentation",
        (current, total) => setExportProgress(`Rendering slide ${current}/${total}...`),
      );
    } catch {
      setExportProgress("Export failed");
      await new Promise((r) => setTimeout(r, 1500));
    } finally {
      setIsExporting(false);
      setExportProgress("");
    }
  }, [presentation.slides, presentation.themeCss, presentation.title]);

  const handleSelectPresentation = (
    id: Id<"presentations">,
    data: { mode?: string; html?: string; title: string; themeCss?: string; slides?: SlideData[] }
  ) => {
    setPresentationFromSaved(id, data);
  };

  const handleNew = () => {
    clearPresentation();
    setShowHistory(false);
  };

  // Keyboard navigation for slides
  useEffect(() => {
    if (Platform.OS !== "web" || presentation.mode !== "slides" || presentation.slides.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't navigate if user is typing in an input
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      // Also skip if inside contenteditable
      if ((e.target as HTMLElement)?.isContentEditable) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentSlide(presentation.currentSlide - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setCurrentSlide(presentation.currentSlide + 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [presentation.mode, presentation.slides.length, presentation.currentSlide, setCurrentSlide]);

  // Build slide HTML for iframe
  const slideHtml = useMemo(() => {
    if (presentation.mode !== "slides" || presentation.slides.length === 0) return "";
    const slide = presentation.slides[presentation.currentSlide];
    if (!slide) return "";
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 100%; height: 100%; overflow: hidden; }
${presentation.themeCss}
</style>
</head>
<body>
${slide.html}
</body>
</html>`;
  }, [presentation.mode, presentation.themeCss, presentation.slides, presentation.currentSlide]);

  if (!hasContent) {
    return (
      <View style={styles.empty}>
        <FontAwesome name="television" size={48} color={KoinoniaColors.border} />
        <Text style={styles.emptyTitle}>Presentation Canvas</Text>
        <Text style={styles.emptyText}>
          Ask the AI to create a sermon outline, visual aid, or teaching
          material. It will appear here as a live presentation.
        </Text>
        <TouchableOpacity
          style={styles.historyBtn}
          onPress={() => setShowHistory(true)}
          activeOpacity={0.7}
        >
          <FontAwesome name="history" size={14} color={KoinoniaColors.primary} />
          <Text style={styles.historyBtnText}>View Saved Presentations</Text>
        </TouchableOpacity>

        {showHistory && (
          <PresentationList
            activePresentationId={presentation.savedId}
            onSelect={handleSelectPresentation}
            onClose={() => setShowHistory(false)}
            onNew={handleNew}
          />
        )}
      </View>
    );
  }

  if (Platform.OS === "web") {
    const isSlides = presentation.mode === "slides";
    const iframeSrcDoc = isSlides ? slideHtml : presentation.html;
    const totalSlides = presentation.slides.length;
    const currentIdx = presentation.currentSlide;
    const currentSlideTitle = isSlides && presentation.slides[currentIdx]
      ? presentation.slides[currentIdx].title
      : null;

    return (
      <View style={styles.container}>
        <View style={styles.titleBar}>
          <View style={styles.titleLeft}>
            <TouchableOpacity onPress={handleNew} style={styles.titleBtn}>
              <FontAwesome name="plus" size={14} color={KoinoniaColors.warmGray} />
            </TouchableOpacity>
          </View>
          <Text style={styles.titleText} numberOfLines={1}>
            {presentation.title || "Presentation"}
          </Text>
          <View style={styles.titleRight}>
            <View>
              <TouchableOpacity
                onPress={() => !isExporting && setShowExportMenu(!showExportMenu)}
                style={styles.titleBtn}
                disabled={isExporting}
              >
                {isExporting ? (
                  <ActivityIndicator size="small" color={KoinoniaColors.primary} />
                ) : (
                  <FontAwesome name="download" size={14} color={KoinoniaColors.warmGray} />
                )}
              </TouchableOpacity>
              {showExportMenu && (
                <View style={styles.exportMenu}>
                  {isSlides ? (
                    <>
                      <TouchableOpacity style={styles.exportMenuItem} onPress={handleExportPptx}>
                        <FontAwesome name="file-powerpoint-o" size={14} color={KoinoniaColors.darkBrown} />
                        <Text style={styles.exportMenuText}>PowerPoint (.pptx)</Text>
                      </TouchableOpacity>
                      <View style={styles.exportMenuDivider} />
                      <TouchableOpacity style={styles.exportMenuItem} onPress={handleExportImages}>
                        <FontAwesome name="image" size={14} color={KoinoniaColors.darkBrown} />
                        <Text style={styles.exportMenuText}>Images (.png zip)</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity style={styles.exportMenuItem} onPress={handleExportPdf}>
                      <FontAwesome name="file-pdf-o" size={14} color={KoinoniaColors.darkBrown} />
                      <Text style={styles.exportMenuText}>Export as PDF</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={() => setShowHistory(!showHistory)}
              style={styles.titleBtn}
            >
              <FontAwesome name="history" size={14} color={KoinoniaColors.warmGray} />
            </TouchableOpacity>
          </View>
        </View>

        {isExporting && exportProgress && (
          <View style={styles.exportProgressBar}>
            <ActivityIndicator size="small" color={KoinoniaColors.primary} />
            <Text style={styles.exportProgressText}>{exportProgress}</Text>
          </View>
        )}

        {/* @ts-ignore - iframe is a valid web element */}
        <iframe
          ref={iframeRef}
          srcDoc={iframeSrcDoc}
          style={{
            flex: 1,
            width: "100%",
            height: "100%",
            border: "none",
          }}
          sandbox="allow-scripts allow-same-origin"
          title={presentation.title || "Presentation"}
        />

        {/* Slide navigation bar */}
        {isSlides && totalSlides > 0 && (
          <View style={styles.navBar}>
            <TouchableOpacity
              style={[styles.navBtn, currentIdx === 0 && styles.navBtnDisabled]}
              onPress={() => setCurrentSlide(currentIdx - 1)}
              disabled={currentIdx === 0}
            >
              <FontAwesome
                name="chevron-left"
                size={14}
                color={currentIdx === 0 ? KoinoniaColors.border : KoinoniaColors.darkBrown}
              />
            </TouchableOpacity>

            <View style={styles.navCenter}>
              <Text style={styles.navCounter}>
                Slide {currentIdx + 1} of {totalSlides}
              </Text>
              {currentSlideTitle && (
                <Text style={styles.navSlideTitle} numberOfLines={1}>
                  {currentSlideTitle}
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={[styles.navBtn, currentIdx >= totalSlides - 1 && styles.navBtnDisabled]}
              onPress={() => setCurrentSlide(currentIdx + 1)}
              disabled={currentIdx >= totalSlides - 1}
            >
              <FontAwesome
                name="chevron-right"
                size={14}
                color={currentIdx >= totalSlides - 1 ? KoinoniaColors.border : KoinoniaColors.darkBrown}
              />
            </TouchableOpacity>
          </View>
        )}

        {showHistory && (
          <PresentationList
            activePresentationId={presentation.savedId}
            onSelect={handleSelectPresentation}
            onClose={() => setShowHistory(false)}
            onNew={handleNew}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>
        Presentations are currently available on the web version.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  titleBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: KoinoniaColors.cream,
    borderBottomWidth: 1,
    borderBottomColor: KoinoniaColors.divider,
  },
  titleLeft: {
    flexDirection: "row",
    alignItems: "center",
    width: 40,
  },
  titleRight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 2,
  },
  titleText: {
    flex: 1,
    fontFamily: Fonts.headingSemiBold,
    fontSize: 16,
    color: KoinoniaColors.darkBrown,
    textAlign: "center",
  },
  titleBtn: {
    padding: 6,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
    backgroundColor: KoinoniaColors.warmWhite,
  },
  emptyTitle: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 20,
    color: KoinoniaColors.darkBrown,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 22,
    color: KoinoniaColors.warmGray,
    textAlign: "center",
  },
  historyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: KoinoniaColors.border,
    backgroundColor: KoinoniaColors.cream,
  },
  historyBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: KoinoniaColors.primary,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: KoinoniaColors.cream,
    borderTopWidth: 1,
    borderTopColor: KoinoniaColors.divider,
  },
  navBtn: {
    padding: 8,
    borderRadius: 6,
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  navCenter: {
    flex: 1,
    alignItems: "center",
  },
  navCounter: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: KoinoniaColors.darkBrown,
  },
  navSlideTitle: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: KoinoniaColors.warmGray,
    marginTop: 2,
  },
  exportMenu: {
    position: "absolute",
    top: 36,
    right: 0,
    backgroundColor: KoinoniaColors.cream,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: KoinoniaColors.border,
    paddingVertical: 4,
    minWidth: 180,
    zIndex: 100,
    // web shadow
    ...(Platform.OS === "web" ? { boxShadow: "0 4px 12px rgba(0,0,0,0.12)" } : {}),
  },
  exportMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  exportMenuText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: KoinoniaColors.darkBrown,
  },
  exportMenuDivider: {
    height: 1,
    backgroundColor: KoinoniaColors.divider,
    marginHorizontal: 8,
  },
  exportProgressBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: KoinoniaColors.cream,
    borderBottomWidth: 1,
    borderBottomColor: KoinoniaColors.divider,
  },
  exportProgressText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: KoinoniaColors.warmGray,
    fontStyle: "italic",
  },
});
