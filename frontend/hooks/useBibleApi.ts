import { useState, useEffect, useMemo } from "react";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3141";

const cache = new Map<string, unknown>();

async function fetchCached<T>(path: string): Promise<T> {
  if (cache.has(path)) return cache.get(path) as T;
  const res = await fetch(`${API_URL}${path}`);
  const data = await res.json();
  cache.set(path, data);
  return data as T;
}

export type Translation = {
  short_name: string;
  full_name: string;
  language: string;
  direction: string;
};

export type Book = {
  book_id: number;
  name: string;
  chapters: number;
  chron_order: number;
  testament: string;
};

export type Verse = {
  verse: number;
  text: string;
};

export type CrossRef = {
  from_verse: number;
  to_book: number;
  to_chapter: number;
  to_verse: number;
  to_end_verse: number | null;
  relevance: number;
  book_name: string;
};

export function useBibleApi(
  translation: string,
  bookId: number,
  chapter: number
) {
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [allCrossRefs, setAllCrossRefs] = useState<CrossRef[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCached<Translation[]>("/api/bible/translations").then(setTranslations);
  }, []);

  useEffect(() => {
    fetchCached<Book[]>(`/api/bible/books/${translation}`).then(setBooks);
  }, [translation]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchCached<Verse[]>(
        `/api/bible/chapter/${translation}/${bookId}/${chapter}`
      ),
      fetchCached<CrossRef[]>(
        `/api/bible/crossrefs/${bookId}/${chapter}?translation=${translation}`
      ),
    ])
      .then(([v, cr]) => {
        setVerses(v);
        setAllCrossRefs(cr);
      })
      .finally(() => setLoading(false));
  }, [translation, bookId, chapter]);

  // Group cross-refs by verse for easy lookup
  const crossRefsByVerse = useMemo(() => {
    const map = new Map<number, CrossRef[]>();
    for (const cr of allCrossRefs) {
      const existing = map.get(cr.from_verse) || [];
      existing.push(cr);
      map.set(cr.from_verse, existing);
    }
    return map;
  }, [allCrossRefs]);

  return { translations, books, verses, crossRefsByVerse, loading };
}

// Fetch a single verse text (for the cross-ref modal)
export async function fetchVerseText(
  translation: string,
  bookId: number,
  chapter: number,
  verse: number
): Promise<string> {
  const res = await fetch(
    `${API_URL}/api/bible/verse/${translation}/${bookId}/${chapter}/${verse}`
  );
  const data = await res.json();
  return data.text || "";
}
