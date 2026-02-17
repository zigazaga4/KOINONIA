import { useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../server/convex/_generated/api";
import type { Id, Doc } from "../../server/convex/_generated/dataModel";

export type Highlight = Doc<"highlights">;

export function useHighlights(bookId: number, chapter: number) {
  const highlights = useQuery(api.highlights.listByChapter, { bookId, chapter });
  const createMut = useMutation(api.highlights.create);
  const removeMut = useMutation(api.highlights.remove);

  const highlightsByVerse = useMemo(() => {
    const map = new Map<number, Highlight[]>();
    if (!highlights) return map;
    for (const h of highlights) {
      const arr = map.get(h.verse) || [];
      arr.push(h);
      map.set(h.verse, arr);
    }
    return map;
  }, [highlights]);

  const addHighlight = (
    verse: number,
    startWord: number,
    endWord: number,
    color: string
  ) => {
    return createMut({ bookId, chapter, verse, startWord, endWord, color });
  };

  const deleteHighlight = (id: Id<"highlights">) => {
    return removeMut({ highlightId: id });
  };

  return { highlightsByVerse, addHighlight, deleteHighlight, loading: highlights === undefined };
}
