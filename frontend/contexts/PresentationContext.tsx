import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";

type SlideData = { title: string; html: string };

type PresentationState = {
  mode: "document" | "slides";
  html: string;
  title: string;
  themeCss: string;
  slides: SlideData[];
  currentSlide: number;
  /** Convex ID of the saved presentation (null if not yet saved) */
  savedId: string | null;
};

type PresentationContextType = {
  presentation: PresentationState;
  hasContent: boolean;
  setDocumentPresentation: (html: string, title?: string) => void;
  setSlidesPresentation: (themeCss: string, slides: SlideData[], title?: string) => void;
  setPresentationFromSaved: (id: string, data: {
    mode?: string;
    html?: string;
    title: string;
    themeCss?: string;
    slides?: SlideData[];
  }) => void;
  setCurrentSlide: (index: number) => void;
  clearPresentation: () => void;
};

const emptyState: PresentationState = {
  mode: "document",
  html: "",
  title: "",
  themeCss: "",
  slides: [],
  currentSlide: 0,
  savedId: null,
};

const PresentationContext = createContext<PresentationContextType>({
  presentation: emptyState,
  hasContent: false,
  setDocumentPresentation: () => {},
  setSlidesPresentation: () => {},
  setPresentationFromSaved: () => {},
  setCurrentSlide: () => {},
  clearPresentation: () => {},
});

export function PresentationProvider({ children }: { children: ReactNode }) {
  const [presentation, setPresentationState] = useState<PresentationState>(emptyState);

  const hasContent = useMemo(() => {
    if (presentation.mode === "slides") return presentation.slides.length > 0;
    return presentation.html !== "";
  }, [presentation.mode, presentation.html, presentation.slides.length]);

  const setDocumentPresentation = useCallback((html: string, title?: string) => {
    setPresentationState((prev) => ({
      ...prev,
      mode: "document",
      html,
      title: title ?? prev.title,
      themeCss: "",
      slides: [],
      currentSlide: 0,
      savedId: null,
    }));
  }, []);

  const setSlidesPresentation = useCallback((themeCss: string, slides: SlideData[], title?: string) => {
    setPresentationState((prev) => ({
      ...prev,
      mode: "slides",
      html: "",
      themeCss,
      slides,
      title: title ?? prev.title,
      currentSlide: prev.mode === "slides" ? Math.min(prev.currentSlide, Math.max(0, slides.length - 1)) : 0,
      savedId: null,
    }));
  }, []);

  const setPresentationFromSaved = useCallback((id: string, data: {
    mode?: string;
    html?: string;
    title: string;
    themeCss?: string;
    slides?: SlideData[];
  }) => {
    const mode = (data.mode === "slides" ? "slides" : "document") as "document" | "slides";
    setPresentationState({
      mode,
      html: data.html || "",
      title: data.title,
      themeCss: data.themeCss || "",
      slides: data.slides || [],
      currentSlide: 0,
      savedId: id,
    });
  }, []);

  const setCurrentSlide = useCallback((index: number) => {
    setPresentationState((prev) => ({
      ...prev,
      currentSlide: Math.max(0, Math.min(index, prev.slides.length - 1)),
    }));
  }, []);

  const clearPresentation = useCallback(() => {
    setPresentationState(emptyState);
  }, []);

  return (
    <PresentationContext.Provider
      value={{
        presentation,
        hasContent,
        setDocumentPresentation,
        setSlidesPresentation,
        setPresentationFromSaved,
        setCurrentSlide,
        clearPresentation,
      }}
    >
      {children}
    </PresentationContext.Provider>
  );
}

export function usePresentation() {
  return useContext(PresentationContext);
}
