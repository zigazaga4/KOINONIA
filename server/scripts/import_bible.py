#!/usr/bin/env python3
"""
Koinonia Bible Import Script
Downloads Bible data from Bolls.life and stores it in a local SQLite database.

Usage:
    python import_bible.py                          # Import ALL translations
    python import_bible.py --list                   # List available translations
    python import_bible.py -t KJV VDCL NTR          # Import specific translations
    python import_bible.py --db /path/to/bible.db   # Custom output path
"""

import argparse
import json
import os
import re
import sqlite3
import sys
import time
from html import unescape
from pathlib import Path

try:
    import requests
except ImportError:
    print("ERROR: 'requests' package is required.")
    print("Install it with: pip install requests")
    sys.exit(1)


BOLLS_BASE = "https://bolls.life"
DEFAULT_DB = Path(__file__).resolve().parent.parent / "bible.db"

# Book ID ranges for testament classification
# 1-39 = Old Testament, 40-66 = New Testament, 67-89 = Deuterocanonical, 90+ = Non-Canonical
OT_MAX = 39
NT_MAX = 66
DC_MAX = 89


def get_testament(book_id: int) -> str:
    if 1 <= book_id <= OT_MAX:
        return "OT"
    elif OT_MAX < book_id <= NT_MAX:
        return "NT"
    elif NT_MAX < book_id <= DC_MAX:
        return "DC"
    else:
        return "NC"


def strip_html(text: str) -> str:
    """Remove HTML tags, Strong's numbers, and decode entities."""
    if not text:
        return ""
    # Remove Strong's number tags: <S>1234</S>
    text = re.sub(r"<S>\d+</S>", "", text)
    # Convert <br> variants to newlines
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    # Remove <sup>...</sup> footnotes
    text = re.sub(r"<sup>.*?</sup>", "", text, flags=re.DOTALL)
    # Strip all remaining HTML tags
    text = re.sub(r"<[^>]+>", "", text)
    # Decode HTML entities
    text = unescape(text)
    # Collapse multiple spaces
    text = re.sub(r"  +", " ", text)
    return text.strip()


def fetch_json(url: str, label: str = ""):
    """Fetch JSON from a URL with retries."""
    display = label or url
    for attempt in range(3):
        try:
            resp = requests.get(url, timeout=120)
            resp.raise_for_status()
            return resp.json()
        except requests.exceptions.RequestException as e:
            if attempt < 2:
                wait = 2 ** (attempt + 1)
                print(f"  Retry {attempt + 1}/2 for {display}: {e}")
                time.sleep(wait)
            else:
                print(f"  FAILED to fetch {display}: {e}")
                raise


def create_database(db_path: Path) -> sqlite3.Connection:
    """Create the SQLite database with schema."""
    # Remove existing database
    if db_path.exists():
        db_path.unlink()

    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA foreign_keys=ON")

    conn.executescript("""
        CREATE TABLE translations (
            short_name TEXT PRIMARY KEY,
            full_name  TEXT NOT NULL,
            language   TEXT NOT NULL,
            direction  TEXT NOT NULL DEFAULT 'ltr'
        );

        CREATE TABLE books (
            translation TEXT    NOT NULL,
            book_id     INTEGER NOT NULL,
            name        TEXT    NOT NULL,
            chapters    INTEGER NOT NULL,
            chron_order INTEGER NOT NULL,
            testament   TEXT    NOT NULL CHECK(testament IN ('OT', 'NT', 'DC', 'NC')),
            PRIMARY KEY (translation, book_id),
            FOREIGN KEY (translation) REFERENCES translations(short_name)
        );

        CREATE TABLE verses (
            translation TEXT    NOT NULL,
            book_id     INTEGER NOT NULL,
            chapter     INTEGER NOT NULL,
            verse       INTEGER NOT NULL,
            text        TEXT    NOT NULL,
            PRIMARY KEY (translation, book_id, chapter, verse),
            FOREIGN KEY (translation, book_id) REFERENCES books(translation, book_id)
        );

        CREATE INDEX idx_verses_chapter ON verses(translation, book_id, chapter);
        CREATE INDEX idx_books_translation ON books(translation);
    """)

    return conn


def build_fts_index(conn: sqlite3.Connection):
    """Build the full-text search index after all data is inserted."""
    print("\nBuilding full-text search index...")
    conn.executescript("""
        CREATE VIRTUAL TABLE IF NOT EXISTS verses_fts USING fts5(
            text,
            translation UNINDEXED,
            book_id UNINDEXED,
            chapter UNINDEXED,
            verse UNINDEXED,
            tokenize='unicode61'
        );

        INSERT INTO verses_fts(text, translation, book_id, chapter, verse)
        SELECT text, translation, book_id, chapter, verse FROM verses;
    """)
    print("  FTS index built.")


def fetch_translations():
    """Fetch all available translations grouped by language."""
    print("Fetching available translations...")
    data = fetch_json(
        f"{BOLLS_BASE}/static/bolls/app/views/languages.json",
        "translations list"
    )

    # Flatten the language-grouped structure
    translations = []
    for lang_group in data:
        language = lang_group.get("language", "Unknown")
        for t in lang_group.get("translations", []):
            translations.append({
                "short_name": t["short_name"],
                "full_name": t["full_name"],
                "language": language,
                "direction": t.get("dir", "ltr"),
            })

    print(f"  Found {len(translations)} translations across {len(data)} languages.")
    return translations


def fetch_all_books():
    """Fetch book listings for all translations in one request."""
    print("Fetching book listings for all translations...")
    data = fetch_json(
        f"{BOLLS_BASE}/static/bolls/app/views/translations_books.json",
        "all books"
    )
    print(f"  Got book data for {len(data)} translations.")
    return data


def download_translation_verses(code: str):
    """Download all verses for a single translation (bulk endpoint)."""
    return fetch_json(
        f"{BOLLS_BASE}/static/translations/{code}.json",
        f"verses for {code}"
    )


def list_translations(translations):
    """Print a formatted list of all available translations."""
    # Group by language
    by_lang = {}
    for t in translations:
        lang = t["language"]
        if lang not in by_lang:
            by_lang[lang] = []
        by_lang[lang].append(t)

    for lang in sorted(by_lang.keys()):
        print(f"\n  {lang}:")
        for t in sorted(by_lang[lang], key=lambda x: x["short_name"]):
            direction = " (RTL)" if t["direction"] == "rtl" else ""
            print(f"    {t['short_name']:12s} {t['full_name']}{direction}")

    print(f"\n  Total: {len(translations)} translations")


def main():
    parser = argparse.ArgumentParser(
        description="Import Bible data from Bolls.life into SQLite"
    )
    parser.add_argument(
        "--list", "-l", action="store_true",
        help="List all available translations and exit"
    )
    parser.add_argument(
        "--translations", "-t", nargs="+", metavar="CODE",
        help="Translation codes to import (e.g., KJV VDCL NTR). Default: all"
    )
    parser.add_argument(
        "--db", type=Path, default=DEFAULT_DB,
        help=f"Output database path (default: {DEFAULT_DB})"
    )
    args = parser.parse_args()

    # Step 1: Fetch translations
    all_translations = fetch_translations()

    if args.list:
        list_translations(all_translations)
        return

    # Step 2: Determine which translations to import
    if args.translations:
        codes = {c.upper() for c in args.translations}
        selected = [t for t in all_translations if t["short_name"] in codes]
        not_found = codes - {t["short_name"] for t in selected}
        if not_found:
            print(f"\n  WARNING: Not found: {', '.join(sorted(not_found))}")
        if not selected:
            print("No valid translations selected. Use --list to see available codes.")
            return
    else:
        selected = all_translations
        print(f"\nImporting ALL {len(selected)} translations.")

    print(f"\nTranslations to import ({len(selected)}):")
    for t in selected:
        print(f"  {t['short_name']:12s} {t['full_name']}")

    # Step 3: Fetch all book metadata
    all_books_data = fetch_all_books()

    # Step 4: Create database
    print(f"\nCreating database at: {args.db}")
    conn = create_database(args.db)

    total_verses = 0
    total_books = 0
    failed = []

    try:
        for i, t in enumerate(selected):
            code = t["short_name"]
            progress = f"[{i + 1}/{len(selected)}]"
            print(f"\n{progress} {code} — {t['full_name']}")

            # Insert translation metadata
            conn.execute(
                "INSERT OR REPLACE INTO translations (short_name, full_name, language, direction) VALUES (?, ?, ?, ?)",
                (code, t["full_name"], t["language"], t["direction"])
            )

            # Insert books
            books = all_books_data.get(code)
            if not books:
                print(f"  Fetching books individually...")
                try:
                    books = fetch_json(
                        f"{BOLLS_BASE}/get-books/{code}/",
                        f"books for {code}"
                    )
                except Exception:
                    print(f"  SKIPPING {code}: could not fetch book data.")
                    failed.append(code)
                    continue

            # Build a set of known books from metadata
            known_books = {}
            for book in books:
                book_id = book["bookid"]
                known_books[book_id] = book
                conn.execute(
                    "INSERT OR REPLACE INTO books (translation, book_id, name, chapters, chron_order, testament) VALUES (?, ?, ?, ?, ?, ?)",
                    (
                        code,
                        book_id,
                        book["name"],
                        book["chapters"],
                        book.get("chronorder", book_id),
                        get_testament(book_id),
                    )
                )

            total_books += len(known_books)
            print(f"  {len(known_books)} books")

            # Download verses
            print(f"  Downloading verses...")
            try:
                verses_data = download_translation_verses(code)
            except Exception as e:
                print(f"  SKIPPING {code}: could not download verses — {e}")
                failed.append(code)
                conn.commit()
                continue

            # Scan for book IDs in verses that aren't in metadata and auto-create them
            extra_book_ids = set()
            max_chapter = {}  # track max chapter per book_id for auto-created entries
            for v in verses_data:
                bid = v["book"]
                ch = v["chapter"]
                if bid not in known_books:
                    extra_book_ids.add(bid)
                    if bid not in max_chapter or ch > max_chapter[bid]:
                        max_chapter[bid] = ch

            for bid in extra_book_ids:
                conn.execute(
                    "INSERT OR REPLACE INTO books (translation, book_id, name, chapters, chron_order, testament) VALUES (?, ?, ?, ?, ?, ?)",
                    (code, bid, f"Book {bid}", max_chapter[bid], bid, get_testament(bid))
                )
                known_books[bid] = True
                total_books += 1

            if extra_book_ids:
                print(f"  Auto-created {len(extra_book_ids)} missing book entries: {sorted(extra_book_ids)}")

            # Insert verses in batches
            verse_count = 0
            batch = []
            for v in verses_data:
                clean_text = strip_html(v.get("text", ""))
                if not clean_text:
                    continue
                batch.append((
                    code,
                    v["book"],
                    v["chapter"],
                    v["verse"],
                    clean_text,
                ))
                verse_count += 1

                if len(batch) >= 5000:
                    conn.executemany(
                        "INSERT OR REPLACE INTO verses (translation, book_id, chapter, verse, text) VALUES (?, ?, ?, ?, ?)",
                        batch
                    )
                    batch.clear()

            # Flush remaining
            if batch:
                conn.executemany(
                    "INSERT OR REPLACE INTO verses (translation, book_id, chapter, verse, text) VALUES (?, ?, ?, ?, ?)",
                    batch
                )

            conn.commit()
            total_verses += verse_count
            print(f"  {verse_count:,} verses")

            # Brief pause between downloads to be polite
            if i < len(selected) - 1:
                time.sleep(0.5)

        # Step 5: Build FTS index
        build_fts_index(conn)
        conn.commit()

        # Step 6: Optimize
        print("\nOptimizing database...")
        conn.execute("ANALYZE")
        conn.execute("PRAGMA optimize")
        conn.commit()

    finally:
        conn.close()

    # Summary
    db_size_mb = args.db.stat().st_size / (1024 * 1024)
    print(f"\n{'=' * 50}")
    print(f"Import complete!")
    print(f"  Database: {args.db}")
    print(f"  Size: {db_size_mb:.1f} MB")
    print(f"  Translations: {len(selected) - len(failed)}")
    print(f"  Books: {total_books:,}")
    print(f"  Verses: {total_verses:,}")
    if failed:
        print(f"  Failed: {', '.join(failed)}")
    print(f"{'=' * 50}")


if __name__ == "__main__":
    main()
