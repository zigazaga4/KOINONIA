import { Hono } from "hono";
import { queries } from "../lib/db.js";

const bible = new Hono();

// GET /api/bible/translations
bible.get("/translations", (c) => {
  const rows = queries.translations.all();
  return c.json(rows);
});

// Non-canonical books live under "ENC" translation, deuterocanonical fallback is "KJV".
// Both are transparently appended when the selected translation lacks them.
const NC_TRANSLATION = "ENC";
const DC_FALLBACK = "KJV";
const NC_MIN_BOOK_ID = 90;
const DC_MIN_BOOK_ID = 67;

function resolveTranslation(translation: string, bookId: number): string {
  if (bookId >= NC_MIN_BOOK_ID) return NC_TRANSLATION;
  // DC books (67-89): check if the translation actually has them, otherwise use KJV
  if (bookId >= DC_MIN_BOOK_ID) {
    const exists = queries.verse.get(translation, bookId, 1, 1);
    if (!exists) return DC_FALLBACK;
  }
  return translation;
}

// GET /api/bible/books/:translation
bible.get("/books/:translation", (c) => {
  const { translation } = c.req.param();
  const rows = queries.books.all(translation) as any[];
  if (rows.length === 0) {
    return c.json({ error: "Translation not found" }, 404);
  }

  // Check if this translation has DC books
  const hasDC = rows.some((b: any) => b.testament === "DC");
  if (!hasDC) {
    // Append DC books from KJV as fallback
    const dcRows = queries.dcBooks.all() as any[];
    rows.push(...dcRows);
  }

  // Append non-canonical books (from ENC)
  if (translation !== NC_TRANSLATION) {
    const ncRows = queries.ncBooks.all() as any[];
    rows.push(...ncRows);
  }

  return c.json(rows);
});

// GET /api/bible/chapter/:translation/:bookId/:chapter
bible.get("/chapter/:translation/:bookId/:chapter", (c) => {
  const { translation, bookId, chapter } = c.req.param();
  const bid = Number(bookId);
  const rows = queries.chapter.all(resolveTranslation(translation, bid), bid, Number(chapter));
  return c.json(rows);
});

// GET /api/bible/search?q=...&translation=...
bible.get("/search", (c) => {
  const q = c.req.query("q");
  const translation = c.req.query("translation") || "KJV";
  if (!q || q.length < 2) {
    return c.json({ error: "Query too short" }, 400);
  }
  const rows = queries.search.all(translation, q);
  return c.json(rows);
});

// GET /api/bible/crossrefs/:bookId/:chapter?translation=KJV — all cross-refs for a chapter
bible.get("/crossrefs/:bookId/:chapter", (c) => {
  const { bookId, chapter } = c.req.param();
  const translation = c.req.query("translation") || "KJV";
  const bid = Number(bookId);
  const rows = queries.chapterCrossRefs.all(
    resolveTranslation(translation, bid), bid, Number(chapter)
  );
  return c.json(rows);
});

// GET /api/bible/verse/:translation/:bookId/:chapter/:verse — single verse text
bible.get("/verse/:translation/:bookId/:chapter/:verse", (c) => {
  const { translation, bookId, chapter, verse } = c.req.param();
  const bid = Number(bookId);
  const row = queries.verse.get(resolveTranslation(translation, bid), bid, Number(chapter), Number(verse));
  return c.json(row || { text: "" });
});

// GET /api/bible/crossrefs/:bookId/:chapter/:verse?translation=KJV — single verse cross-refs
bible.get("/crossrefs/:bookId/:chapter/:verse", (c) => {
  const { bookId, chapter, verse } = c.req.param();
  const translation = c.req.query("translation") || "KJV";
  const rows = queries.crossRefs.all(
    translation, translation,
    Number(bookId), Number(chapter), Number(verse)
  );
  return c.json(rows);
});

export default bible;
