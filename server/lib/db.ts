import Database from "better-sqlite3";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, "..", "bible.db");

const db = new Database(DB_PATH, { readonly: true });
db.pragma("journal_mode = WAL");
db.pragma("cache_size = -64000"); // 64MB cache

export const queries = {
  translations: db.prepare(
    "SELECT short_name, full_name, language, direction FROM translations ORDER BY language, short_name"
  ),

  books: db.prepare(
    "SELECT book_id, name, chapters, chron_order, testament FROM books WHERE translation = ? ORDER BY book_id"
  ),

  // Deuterocanonical books from KJV (fallback for translations that lack them)
  dcBooks: db.prepare(
    "SELECT book_id, name, chapters, chron_order, testament FROM books WHERE translation = 'KJV' AND testament = 'DC' ORDER BY book_id"
  ),

  // Non-canonical books (always from ENC translation, appended to any translation)
  ncBooks: db.prepare(
    "SELECT book_id, name, chapters, chron_order, testament FROM books WHERE translation = 'ENC' AND testament = 'NC' ORDER BY book_id"
  ),

  chapter: db.prepare(
    "SELECT verse, text FROM verses WHERE translation = ? AND book_id = ? AND chapter = ? ORDER BY verse"
  ),

  search: db.prepare(
    `SELECT translation, book_id, chapter, verse,
            highlight(verses_fts, 0, '<mark>', '</mark>') as text
     FROM verses_fts
     WHERE translation = ? AND text MATCH ?
     ORDER BY rank
     LIMIT 50`
  ),

  chapterCrossRefs: db.prepare(
    `SELECT cr.from_verse, cr.to_book, cr.to_chapter, cr.to_verse,
            cr.to_end_verse, cr.relevance, b.name as book_name
     FROM cross_references cr
     LEFT JOIN books b ON b.translation = ? AND b.book_id = cr.to_book
     WHERE cr.from_book = ? AND cr.from_chapter = ?
     ORDER BY cr.from_verse, cr.relevance DESC`
  ),

  verse: db.prepare(
    "SELECT text FROM verses WHERE translation = ? AND book_id = ? AND chapter = ? AND verse = ?"
  ),

  bookByName: db.prepare(
    "SELECT book_id, name, chapters FROM books WHERE translation = ? AND name = ? COLLATE NOCASE LIMIT 1"
  ),

  verseRange: db.prepare(
    "SELECT verse, text FROM verses WHERE translation = ? AND book_id = ? AND chapter = ? AND verse >= ? AND verse <= ? ORDER BY verse"
  ),

  crossRefsForRange: db.prepare(
    `SELECT cr.from_verse, cr.to_book, cr.to_chapter, cr.to_verse,
            cr.to_end_verse, cr.relevance, b.name as book_name
     FROM cross_references cr
     LEFT JOIN books b ON b.translation = ? AND b.book_id = cr.to_book
     WHERE cr.from_book = ? AND cr.from_chapter = ? AND cr.from_verse >= ? AND cr.from_verse <= ?
     ORDER BY cr.from_verse, cr.relevance DESC`
  ),

  crossRefs: db.prepare(
    `SELECT cr.to_book, cr.to_chapter, cr.to_verse,
            cr.to_end_book, cr.to_end_chapter, cr.to_end_verse,
            cr.relevance,
            v.text, b.name as book_name
     FROM cross_references cr
     LEFT JOIN verses v ON v.translation = ? AND v.book_id = cr.to_book
                           AND v.chapter = cr.to_chapter AND v.verse = cr.to_verse
     LEFT JOIN books b ON b.translation = ? AND b.book_id = cr.to_book
     WHERE cr.from_book = ? AND cr.from_chapter = ? AND cr.from_verse = ?
     ORDER BY cr.relevance DESC
     LIMIT 20`
  ),
};

export default db;
