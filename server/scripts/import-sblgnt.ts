/**
 * Import SBLGNT (SBL Greek New Testament) into the bible.db
 * Source: https://github.com/LogosBible/SBLGNT (CC-BY-4.0)
 *
 * Based on the Nestle-Aland / UBS tradition — the critical text
 * compiled from the oldest available Greek manuscripts (2nd-4th century).
 */

import Database from "better-sqlite3";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "..", "bible.db");
const SBLGNT_DIR = "/tmp/SBLGNT/data/sblgnt/text";

const TRANSLATION = "SBLGNT";

// Map SBLGNT filenames → standard book_id (same as KJV/TR)
const BOOK_MAP: Record<string, { id: number; name: string; greekName: string }> = {
  "Matt.txt":   { id: 40, name: "Matthew",         greekName: "ΚΑΤΑ ΜΑΤΘΑΙΟΝ" },
  "Mark.txt":   { id: 41, name: "Mark",             greekName: "ΚΑΤΑ ΜΑΡΚΟΝ" },
  "Luke.txt":   { id: 42, name: "Luke",             greekName: "ΚΑΤΑ ΛΟΥΚΑΝ" },
  "John.txt":   { id: 43, name: "John",             greekName: "ΚΑΤΑ ΙΩΑΝΝΗΝ" },
  "Acts.txt":   { id: 44, name: "Acts",             greekName: "ΠΡΑΞΕΙΣ ΤΩΝ ΑΠΟΣΤΟΛΩΝ" },
  "Rom.txt":    { id: 45, name: "Romans",           greekName: "ΠΡΟΣ ΡΩΜΑΙΟΥΣ" },
  "1Cor.txt":   { id: 46, name: "1 Corinthians",    greekName: "ΠΡΟΣ ΚΟΡΙΝΘΙΟΥΣ Α΄" },
  "2Cor.txt":   { id: 47, name: "2 Corinthians",    greekName: "ΠΡΟΣ ΚΟΡΙΝΘΙΟΥΣ Β΄" },
  "Gal.txt":    { id: 48, name: "Galatians",        greekName: "ΠΡΟΣ ΓΑΛΑΤΑΣ" },
  "Eph.txt":    { id: 49, name: "Ephesians",        greekName: "ΠΡΟΣ ΕΦΕΣΙΟΥΣ" },
  "Phil.txt":   { id: 50, name: "Philippians",      greekName: "ΠΡΟΣ ΦΙΛΙΠΠΗΣΙΟΥΣ" },
  "Col.txt":    { id: 51, name: "Colossians",       greekName: "ΠΡΟΣ ΚΟΛΟΣΣΑΕΙΣ" },
  "1Thess.txt": { id: 52, name: "1 Thessalonians",  greekName: "ΠΡΟΣ ΘΕΣΣΑΛΟΝΙΚΕΙΣ Α΄" },
  "2Thess.txt": { id: 53, name: "2 Thessalonians",  greekName: "ΠΡΟΣ ΘΕΣΣΑΛΟΝΙΚΕΙΣ Β΄" },
  "1Tim.txt":   { id: 54, name: "1 Timothy",        greekName: "ΠΡΟΣ ΤΙΜΟΘΕΟΝ Α΄" },
  "2Tim.txt":   { id: 55, name: "2 Timothy",        greekName: "ΠΡΟΣ ΤΙΜΟΘΕΟΝ Β΄" },
  "Titus.txt":  { id: 56, name: "Titus",            greekName: "ΠΡΟΣ ΤΙΤΟΝ" },
  "Phlm.txt":   { id: 57, name: "Philemon",         greekName: "ΠΡΟΣ ΦΙΛΗΜΟΝΑ" },
  "Heb.txt":    { id: 58, name: "Hebrews",          greekName: "ΠΡΟΣ ΕΒΡΑΙΟΥΣ" },
  "Jas.txt":    { id: 59, name: "James",            greekName: "ΙΑΚΩΒΟΥ" },
  "1Pet.txt":   { id: 60, name: "1 Peter",          greekName: "ΠΕΤΡΟΥ Α΄" },
  "2Pet.txt":   { id: 61, name: "2 Peter",          greekName: "ΠΕΤΡΟΥ Β΄" },
  "1John.txt":  { id: 62, name: "1 John",           greekName: "ΙΩΑΝΝΟΥ Α΄" },
  "2John.txt":  { id: 63, name: "2 John",           greekName: "ΙΩΑΝΝΟΥ Β΄" },
  "3John.txt":  { id: 64, name: "3 John",           greekName: "ΙΩΑΝΝΟΥ Γ΄" },
  "Jude.txt":   { id: 65, name: "Jude",             greekName: "ΙΟΥΔΑ" },
  "Rev.txt":    { id: 66, name: "Revelation",       greekName: "ΑΠΟΚΑΛΥΨΙΣ ΙΩΑΝΝΟΥ" },
};

// Chronological order for NT books (same as KJV)
const CHRON_ORDER: Record<number, number> = {
  40: 40, 41: 41, 42: 42, 43: 43, 44: 44, 45: 45, 46: 46, 47: 47,
  48: 48, 49: 49, 50: 50, 51: 51, 52: 52, 53: 53, 54: 54, 55: 55,
  56: 56, 57: 57, 58: 58, 59: 59, 60: 60, 61: 61, 62: 62, 63: 63,
  64: 64, 65: 65, 66: 66,
};

// Strip textual apparatus markers (⸀ ⸁ ⸂ ⸃ ⸄ ⸅ etc.)
function cleanText(text: string): string {
  return text
    .replace(/[⸀⸁⸂⸃⸄⸅⸆⸇⸈⸉]/g, "")
    .trim();
}

function parseBook(filename: string): { bookId: number; verses: Array<{ chapter: number; verse: number; text: string }>; maxChapter: number } {
  const meta = BOOK_MAP[filename];
  if (!meta) throw new Error(`Unknown book file: ${filename}`);

  const content = readFileSync(join(SBLGNT_DIR, filename), "utf-8");
  const lines = content.split("\n");
  const verses: Array<{ chapter: number; verse: number; text: string }> = [];
  let maxChapter = 0;

  for (const line of lines) {
    // Skip empty lines and title lines (no tab)
    if (!line.includes("\t")) continue;

    const [ref, text] = line.split("\t");
    if (!ref || !text) continue;

    // Parse "1Cor 1:1" → chapter=1, verse=1
    const match = ref.match(/(\d+):(\d+)$/);
    if (!match) continue;

    const chapter = parseInt(match[1], 10);
    const verse = parseInt(match[2], 10);

    verses.push({ chapter, verse, text: cleanText(text) });
    if (chapter > maxChapter) maxChapter = chapter;
  }

  return { bookId: meta.id, verses, maxChapter };
}

function main() {
  const db = new Database(DB_PATH);

  // Enable WAL for better write performance
  db.pragma("journal_mode = WAL");

  // Check if SBLGNT already exists
  const existing = db.prepare("SELECT COUNT(*) as cnt FROM books WHERE translation = ?").get(TRANSLATION) as { cnt: number };
  if (existing.cnt > 0) {
    console.log("SBLGNT already imported, removing old data...");
    db.prepare("DELETE FROM verses WHERE translation = ?").run(TRANSLATION);
    db.prepare("DELETE FROM books WHERE translation = ?").run(TRANSLATION);
    db.prepare("DELETE FROM translations WHERE short_name = ?").run(TRANSLATION);
  }

  // Insert translation
  db.prepare("INSERT INTO translations (short_name, full_name, language, direction) VALUES (?, ?, ?, ?)").run(
    TRANSLATION,
    "SBL Greek New Testament",
    "Greek Ελληνικά",
    "ltr"
  );

  const insertBook = db.prepare(
    "INSERT INTO books (translation, book_id, name, chapters, chron_order, testament) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const insertVerse = db.prepare(
    "INSERT INTO verses (translation, book_id, chapter, verse, text) VALUES (?, ?, ?, ?, ?)"
  );

  const files = readdirSync(SBLGNT_DIR).filter((f) => f.endsWith(".txt"));
  let totalVerses = 0;
  let totalBooks = 0;

  const insertAll = db.transaction(() => {
    for (const file of files) {
      const meta = BOOK_MAP[file];
      if (!meta) {
        console.warn(`  Skipping unknown file: ${file}`);
        continue;
      }

      const { bookId, verses, maxChapter } = parseBook(file);

      // Insert book — use English name so the AI can look it up the same way
      insertBook.run(TRANSLATION, bookId, meta.name, maxChapter, CHRON_ORDER[bookId] || bookId, "NT");

      for (const v of verses) {
        insertVerse.run(TRANSLATION, bookId, v.chapter, v.verse, v.text);
      }

      totalVerses += verses.length;
      totalBooks++;
      console.log(`  ${meta.name} (${meta.greekName}): ${maxChapter} chapters, ${verses.length} verses`);
    }
  });

  insertAll();

  console.log(`\nDone! Imported ${totalBooks} books, ${totalVerses} verses as "${TRANSLATION}"`);

  // Verify
  const bookCount = db.prepare("SELECT COUNT(*) as cnt FROM books WHERE translation = ?").get(TRANSLATION) as { cnt: number };
  const verseCount = db.prepare("SELECT COUNT(*) as cnt FROM verses WHERE translation = ?").get(TRANSLATION) as { cnt: number };
  console.log(`Verification: ${bookCount.cnt} books, ${verseCount.cnt} verses in DB`);

  db.close();
}

main();
