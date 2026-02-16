/**
 * Test script for the tool calling functions (no AI, just DB queries).
 * Run: npx tsx server/scripts/test-chat.ts
 */

import { queries } from "../lib/db.js";

function executeReadPassage(input: {
  translation: string;
  book_name: string;
  chapter: number;
  from_verse?: number;
  to_verse?: number;
  include_cross_refs?: boolean;
}): string {
  const { translation, book_name, chapter, from_verse, to_verse, include_cross_refs } = input;

  const book = queries.bookByName.get(translation, book_name) as
    | { book_id: number; name: string; chapters: number }
    | undefined;

  if (!book) {
    return JSON.stringify({ error: `Book "${book_name}" not found in ${translation} translation.` });
  }

  let verses: Array<{ verse: number; text: string }>;
  if (from_verse && to_verse) {
    verses = queries.verseRange.all(translation, book.book_id, chapter, from_verse, to_verse) as any;
  } else if (from_verse) {
    verses = queries.verseRange.all(translation, book.book_id, chapter, from_verse, 999) as any;
  } else {
    verses = queries.chapter.all(translation, book.book_id, chapter) as any;
  }

  if (verses.length === 0) {
    return JSON.stringify({ error: `No verses found for ${book_name} ${chapter} in ${translation}.` });
  }

  const result: any = {
    reference: `${book.name} ${chapter}${from_verse ? `:${from_verse}` : ""}${to_verse ? `-${to_verse}` : ""}`,
    verses,
  };

  if (include_cross_refs) {
    const startV = from_verse || 1;
    const endV = to_verse || 999;
    const crossRefs = queries.crossRefsForRange.all(translation, book.book_id, chapter, startV, endV) as any[];

    result.cross_references = crossRefs.map((cr: any) => ({
      from_verse: cr.from_verse,
      reference: `${cr.book_name} ${cr.to_chapter}:${cr.to_verse}${cr.to_end_verse ? `-${cr.to_end_verse}` : ""}`,
      relevance: cr.relevance,
    }));
  }

  return JSON.stringify(result);
}

function test(label: string, fn: () => void) {
  try {
    fn();
    console.log(`  PASS: ${label}`);
  } catch (err: any) {
    console.log(`  FAIL: ${label} — ${err.message}`);
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

console.log("\n=== Testing DB queries ===\n");

test("bookByName — Genesis in KJV", () => {
  const book = queries.bookByName.get("KJV", "Genesis") as any;
  assert(book !== undefined, "Book not found");
  assert(book.book_id === 1, `Expected book_id 1, got ${book.book_id}`);
  assert(book.chapters > 0, `Expected chapters > 0, got ${book.chapters}`);
  console.log(`    → book_id=${book.book_id}, name=${book.name}, chapters=${book.chapters}`);
});

test("bookByName — case insensitive", () => {
  const book = queries.bookByName.get("KJV", "genesis") as any;
  assert(book !== undefined, "Case-insensitive lookup failed");
  assert(book.book_id === 1, `Expected book_id 1, got ${book.book_id}`);
});

test("bookByName — 1 Corinthians", () => {
  const book = queries.bookByName.get("KJV", "1 Corinthians") as any;
  assert(book !== undefined, "Book not found");
  console.log(`    → book_id=${book.book_id}, name=${book.name}`);
});

test("bookByName — nonexistent book", () => {
  const book = queries.bookByName.get("KJV", "Fake Book") as any;
  assert(book === undefined, "Should be undefined for fake book");
});

test("verseRange — Genesis 1:1-5", () => {
  const verses = queries.verseRange.all("KJV", 1, 1, 1, 5) as any[];
  assert(verses.length === 5, `Expected 5 verses, got ${verses.length}`);
  assert(verses[0].verse === 1, `First verse should be 1, got ${verses[0].verse}`);
  assert(verses[4].verse === 5, `Last verse should be 5, got ${verses[4].verse}`);
  console.log(`    → verse 1: "${verses[0].text.slice(0, 60)}..."`);
});

test("verseRange — from verse to end (Genesis 1:29+)", () => {
  const verses = queries.verseRange.all("KJV", 1, 1, 29, 999) as any[];
  assert(verses.length === 3, `Expected 3 verses (29-31), got ${verses.length}`);
  assert(verses[0].verse === 29, `First verse should be 29`);
  assert(verses[2].verse === 31, `Last verse should be 31`);
});

test("crossRefsForRange — Genesis 1:1-3", () => {
  const refs = queries.crossRefsForRange.all("KJV", 1, 1, 1, 3) as any[];
  assert(refs.length > 0, "Expected at least one cross-ref");
  console.log(`    → ${refs.length} cross-refs found`);
  console.log(`    → first: from_verse=${refs[0].from_verse}, ${refs[0].book_name} ${refs[0].to_chapter}:${refs[0].to_verse}`);
});

console.log("\n=== Testing executeReadPassage ===\n");

test("Full chapter — Genesis 1 (KJV)", () => {
  const result = JSON.parse(executeReadPassage({ translation: "KJV", book_name: "Genesis", chapter: 1 }));
  assert(!result.error, result.error);
  assert(result.verses.length === 31, `Expected 31 verses, got ${result.verses.length}`);
  assert(result.reference === "Genesis 1", `Reference: ${result.reference}`);
  console.log(`    → ${result.verses.length} verses, ref="${result.reference}"`);
});

test("Verse range — John 3:16-18", () => {
  const result = JSON.parse(executeReadPassage({ translation: "KJV", book_name: "John", chapter: 3, from_verse: 16, to_verse: 18 }));
  assert(!result.error, result.error);
  assert(result.verses.length === 3, `Expected 3 verses, got ${result.verses.length}`);
  console.log(`    → ref="${result.reference}"`);
  for (const v of result.verses) {
    console.log(`    → v${v.verse}: "${v.text.slice(0, 80)}..."`);
  }
});

test("Single verse — Romans 8:28", () => {
  const result = JSON.parse(executeReadPassage({ translation: "KJV", book_name: "Romans", chapter: 8, from_verse: 28, to_verse: 28 }));
  assert(!result.error, result.error);
  assert(result.verses.length === 1, `Expected 1 verse, got ${result.verses.length}`);
  console.log(`    → "${result.verses[0].text}"`);
});

test("With cross-refs — Genesis 1:1-3", () => {
  const result = JSON.parse(executeReadPassage({ translation: "KJV", book_name: "Genesis", chapter: 1, from_verse: 1, to_verse: 3, include_cross_refs: true }));
  assert(!result.error, result.error);
  assert(result.verses.length === 3, `Expected 3 verses`);
  assert(result.cross_references && result.cross_references.length > 0, "Expected cross-references");
  console.log(`    → ${result.verses.length} verses, ${result.cross_references.length} cross-refs`);
  for (const cr of result.cross_references.slice(0, 3)) {
    console.log(`    → from v${cr.from_verse}: ${cr.reference} (relevance: ${cr.relevance})`);
  }
});

test("From verse to end — Psalm 23:4+", () => {
  const result = JSON.parse(executeReadPassage({ translation: "KJV", book_name: "Psalms", chapter: 23, from_verse: 4 }));
  assert(!result.error, result.error);
  assert(result.verses.length === 3, `Expected 3 verses (4-6), got ${result.verses.length}`);
  console.log(`    → ${result.verses.length} verses: ${result.verses.map((v: any) => v.verse).join(", ")}`);
});

test("Error — nonexistent book", () => {
  const result = JSON.parse(executeReadPassage({ translation: "KJV", book_name: "FakeBook", chapter: 1 }));
  assert(result.error !== undefined, "Expected error");
  console.log(`    → error: "${result.error}"`);
});

test("Error — nonexistent chapter", () => {
  const result = JSON.parse(executeReadPassage({ translation: "KJV", book_name: "Genesis", chapter: 999 }));
  assert(result.error !== undefined, "Expected error for nonexistent chapter");
  console.log(`    → error: "${result.error}"`);
});

test("Different translation — VDC Romanian", () => {
  const result = JSON.parse(executeReadPassage({ translation: "VDC", book_name: "Geneza", chapter: 1, from_verse: 1, to_verse: 1 }));
  if (result.error) {
    console.log(`    → ${result.error} (VDC may use different book names)`);
    // Try with English name
    const result2 = JSON.parse(executeReadPassage({ translation: "VDC", book_name: "Genesis", chapter: 1, from_verse: 1, to_verse: 1 }));
    if (result2.error) {
      console.log(`    → Also failed with "Genesis": ${result2.error}`);
    } else {
      console.log(`    → Works with "Genesis": "${result2.verses[0].text.slice(0, 80)}..."`);
    }
  } else {
    console.log(`    → "${result.verses[0].text.slice(0, 80)}..."`);
  }
});

console.log("\n=== All tests done ===\n");
