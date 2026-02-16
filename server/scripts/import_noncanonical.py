#!/usr/bin/env python3
"""
Import non-canonical books (1 Enoch, Jubilees, Psalm 151) into the Koinonia Bible database.

These are books with strong historical evidence:
  - 1 Enoch: Directly quoted in Jude 1:14-15, 11+ Aramaic copies in Dead Sea Scrolls, Ethiopian Orthodox canon
  - Jubilees: 15 Hebrew copies at Qumran (more than most canonical books), Ethiopian Orthodox canon
  - Psalm 151: Found in Dead Sea Scrolls, in the Septuagint (LXX), Orthodox/Coptic/Armenian/Syriac canon

Usage:
    python import_noncanonical.py
    python import_noncanonical.py --db /path/to/bible.db
"""

import argparse
import re
import sqlite3
import sys
from pathlib import Path

DEFAULT_DB = Path(__file__).resolve().parent.parent / "bible.db"
DATA_DIR = Path(__file__).resolve().parent.parent / "data"

# Book definitions: (book_id, name, file, testament)
# Using IDs 90+ to avoid conflicts with existing books (max is 88)
BOOKS = [
    {
        "book_id": 90,
        "name": "1 Enoch",
        "file": "1-enoch.txt",
        "testament": "NC",
        "chron_order": 90,
    },
    {
        "book_id": 91,
        "name": "Jubilees",
        "file": "jubilees.txt",
        "testament": "NC",
        "chron_order": 91,
    },
    {
        "book_id": 92,
        "name": "Psalm 151",
        "file": "psalm-151.txt",
        "testament": "NC",
        "chron_order": 92,
    },
]

# Translation to insert these books under
# Using a virtual translation "ENC" (Enoch/Non-Canonical) with R.H. Charles translations
TRANSLATION = {
    "short_name": "ENC",
    "full_name": "R.H. Charles Translation (Non-Canonical)",
    "language": "English",
    "direction": "ltr",
}


def parse_text_file(filepath: Path) -> list[dict]:
    """Parse a text file with [chapter:verse] markers into structured verses."""
    text = filepath.read_text(encoding="utf-8")

    # Find all [chapter:verse] markers and their text
    pattern = r"\[(\d+):(\d+)\]\s*(.*?)(?=\[\d+:\d+\]|\Z)"
    matches = re.findall(pattern, text, re.DOTALL)

    # Use ordered dict to merge duplicates (some source texts have split verses)
    verse_map: dict[tuple[int, int], str] = {}

    for chapter_str, verse_str, verse_text in matches:
        # Clean up the text
        cleaned = verse_text.strip()
        # Remove editorial markers like ⌈⌈ ⌉⌉ ⌈ ⌉
        cleaned = cleaned.replace("⌈⌈", "").replace("⌉⌉", "")
        cleaned = cleaned.replace("⌈", "").replace("⌉", "")
        # Collapse multiple spaces/newlines into single space
        cleaned = re.sub(r"\s+", " ", cleaned).strip()

        if cleaned:
            key = (int(chapter_str), int(verse_str))
            if key in verse_map:
                # Merge duplicate verse markers
                verse_map[key] += " " + cleaned
            else:
                verse_map[key] = cleaned

    return [
        {"chapter": ch, "verse": vs, "text": txt}
        for (ch, vs), txt in verse_map.items()
    ]


def migrate_check_constraint(conn: sqlite3.Connection):
    """Add 'NC' to the testament CHECK constraint on the books table."""
    # Check if NC is already allowed
    schema = conn.execute(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='books'"
    ).fetchone()

    if schema and "'NC'" in schema[0]:
        print("  CHECK constraint already includes 'NC' — skipping migration.")
        return

    print("  Migrating books table to add 'NC' testament category...")

    # Must disable foreign keys to drop the referenced table
    conn.execute("PRAGMA foreign_keys=OFF")

    conn.executescript("""
        -- Clean up any leftover from previous failed attempt
        DROP TABLE IF EXISTS books_new;

        -- Create new table with updated constraint
        CREATE TABLE books_new (
            translation TEXT    NOT NULL,
            book_id     INTEGER NOT NULL,
            name        TEXT    NOT NULL,
            chapters    INTEGER NOT NULL,
            chron_order INTEGER NOT NULL,
            testament   TEXT    NOT NULL CHECK(testament IN ('OT', 'NT', 'DC', 'NC')),
            PRIMARY KEY (translation, book_id),
            FOREIGN KEY (translation) REFERENCES translations(short_name)
        );

        -- Copy all existing data
        INSERT INTO books_new SELECT * FROM books;

        -- Drop old table
        DROP TABLE books;

        -- Rename new table
        ALTER TABLE books_new RENAME TO books;

        -- Recreate index
        CREATE INDEX IF NOT EXISTS idx_books_translation ON books(translation);
    """)

    conn.execute("PRAGMA foreign_keys=ON")

    print("  Migration complete.")


def import_books(db_path: Path):
    """Import non-canonical books into the database."""
    if not db_path.exists():
        print(f"ERROR: Database not found at {db_path}")
        sys.exit(1)

    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")

    # Step 1: Migrate CHECK constraint
    print("\n=== Step 1: Migrate CHECK constraint ===")
    migrate_check_constraint(conn)

    # Step 2: Insert translation (if not exists)
    print("\n=== Step 2: Register translation ===")
    existing = conn.execute(
        "SELECT short_name FROM translations WHERE short_name = ?",
        (TRANSLATION["short_name"],)
    ).fetchone()

    if existing:
        print(f"  Translation '{TRANSLATION['short_name']}' already exists.")
    else:
        conn.execute(
            "INSERT INTO translations (short_name, full_name, language, direction) VALUES (?, ?, ?, ?)",
            (TRANSLATION["short_name"], TRANSLATION["full_name"],
             TRANSLATION["language"], TRANSLATION["direction"]),
        )
        print(f"  Registered translation: {TRANSLATION['short_name']} — {TRANSLATION['full_name']}")

    # Step 3: Parse and import each book
    print("\n=== Step 3: Import books ===")
    total_verses = 0

    for book_def in BOOKS:
        filepath = DATA_DIR / book_def["file"]
        if not filepath.exists():
            print(f"  SKIP: {book_def['name']} — file not found: {filepath}")
            continue

        # Parse the text file
        verses = parse_text_file(filepath)
        if not verses:
            print(f"  SKIP: {book_def['name']} — no verses parsed")
            continue

        # Calculate chapter count
        chapters = max(v["chapter"] for v in verses)

        # Remove existing data for this book (for re-import)
        conn.execute(
            "DELETE FROM verses WHERE translation = ? AND book_id = ?",
            (TRANSLATION["short_name"], book_def["book_id"]),
        )
        conn.execute(
            "DELETE FROM books WHERE translation = ? AND book_id = ?",
            (TRANSLATION["short_name"], book_def["book_id"]),
        )

        # Insert book
        conn.execute(
            "INSERT INTO books (translation, book_id, name, chapters, chron_order, testament) VALUES (?, ?, ?, ?, ?, ?)",
            (TRANSLATION["short_name"], book_def["book_id"], book_def["name"],
             chapters, book_def["chron_order"], book_def["testament"]),
        )

        # Insert verses in batch
        conn.executemany(
            "INSERT INTO verses (translation, book_id, chapter, verse, text) VALUES (?, ?, ?, ?, ?)",
            [(TRANSLATION["short_name"], book_def["book_id"], v["chapter"], v["verse"], v["text"])
             for v in verses],
        )

        total_verses += len(verses)
        print(f"  ✓ {book_def['name']}: {chapters} chapters, {len(verses)} verses")

    conn.commit()

    # Step 4: Update FTS index
    print("\n=== Step 4: Update full-text search index ===")
    # Delete existing FTS entries for our translation
    conn.execute(
        "DELETE FROM verses_fts WHERE translation = ?",
        (TRANSLATION["short_name"],),
    )
    # Insert new entries
    conn.execute("""
        INSERT INTO verses_fts(text, translation, book_id, chapter, verse)
        SELECT text, translation, book_id, chapter, verse
        FROM verses WHERE translation = ?
    """, (TRANSLATION["short_name"],))
    conn.commit()
    print("  FTS index updated.")

    # Step 5: Verify
    print("\n=== Verification ===")
    for book_def in BOOKS:
        count = conn.execute(
            "SELECT COUNT(*) FROM verses WHERE translation = ? AND book_id = ?",
            (TRANSLATION["short_name"], book_def["book_id"]),
        ).fetchone()[0]
        print(f"  {book_def['name']}: {count} verses in database")

    print(f"\n  Total: {total_verses} verses imported across {len(BOOKS)} books.")

    conn.execute("PRAGMA optimize")
    conn.close()
    print("\nDone!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Import non-canonical books")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB, help="Path to bible.db")
    args = parser.parse_args()
    import_books(args.db)
