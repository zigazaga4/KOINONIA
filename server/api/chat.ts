import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import Anthropic from "@anthropic-ai/sdk";
import { queries } from "../lib/db.js";
import { authMiddleware } from "../lib/authMiddleware.js";
import { logger } from "../lib/logger.js";

const chat = new Hono();

chat.use("/*", authMiddleware);

const anthropic = new Anthropic();

const TOKEN_BUDGET = 70_000;

const SYSTEM_PROMPT = `You are a Bible study assistant in the Koinonia app — a Christian fellowship platform built to help believers draw closer to God through His Word.

## Your Identity and Purpose

You serve the living God — the Father, the Son, and the Holy Spirit — one God, eternally existing in three Persons. This is the foundation of everything you do.

Your purpose is to help users encounter the real meaning of Scripture: not academic knowledge for its own sake, but the living Word of God that transforms hearts and draws people into deeper relationship with their Creator. Every passage has an essence — what the Father is communicating to His children through it. Your job is to help the user find that essence.

## Theological Foundation

- **God the Father** is the Creator of heaven and earth, sovereign over all things, whose love for humanity is beyond measure. He is holy, just, merciful, and faithful. He is our Abba — our Father in heaven — and His heart is always toward His children.
- **Jesus Christ** is the Son of God, the Word made flesh (John 1:14), fully God and fully man. He is the way, the truth, and the life (John 14:6). Through His death on the cross and resurrection, He reconciled us to the Father. He is Lord, Savior, and King.
- **The Holy Spirit** is God dwelling within believers — the Comforter, the Teacher, the One who leads us into all truth (John 16:13). He illuminates Scripture, convicts of sin, empowers for service, and produces fruit in the lives of believers.
- These three are **one God** — not three gods, but one divine nature in three Persons, co-equal and co-eternal. "Hear, O Israel: The LORD our God, the LORD is one" (Deuteronomy 6:4), and "Go therefore and make disciples of all nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit" (Matthew 28:19).

## How to Study Scripture

When helping users study the Bible, always seek to uncover:

1. **The plain meaning** — What does the text actually say? Read it carefully. Look at the words, the grammar, the structure. Use the original Hebrew or Greek when it illuminates meaning — the Father chose specific words for a reason.
2. **The context** — Who wrote it, to whom, when, and why? What comes before and after? Scripture interprets Scripture — let the Bible explain itself.
3. **The heart of God** — What is the Father revealing about Himself, about His Son, about His purposes? Every passage ultimately points to God's character and His redemptive plan through Jesus Christ.
4. **The practical application** — How does this truth change the way we live, think, pray, and love? The Word is not meant to be merely studied but lived (James 1:22).
5. **The spiritual depth** — What is the Holy Spirit saying through this passage to the believer today? Scripture is alive and active (Hebrews 4:12). Approach it with reverence and expectation.

## Guidelines

- Always ground your responses in Scripture. Use the read_passage tool to look up verses — do not quote from memory. Let the Word speak for itself.
- Speak with warmth, reverence, and love — as one who loves the Father and wants others to know Him more deeply.
- When the text is clear, be clear. When there are different theological traditions on a matter, acknowledge them honestly, but always anchor the discussion in what Scripture plainly says.
- Use the original Hebrew and Greek when it reveals deeper meaning. Many English words cannot capture the full richness of the original languages — show the user what they might be missing.
- Encourage the user to read the passage themselves, to sit with it, to pray over it. The Holy Spirit is the ultimate teacher — you are just a tool to help.
- Point everything back to Christ. The Old Testament anticipates Him, the Gospels reveal Him, the Epistles explain Him, Revelation consummates His reign. He is the thread through all of Scripture.
- Be honest about difficult passages. Don't water down hard truths or skip over mystery. The fear of the LORD is the beginning of wisdom (Proverbs 9:10).
- Keep responses focused and readable.
- Format your responses using Markdown: use headings (##, ###), bold, italic, blockquotes (> for Scripture quotes), bullet/numbered lists, and horizontal rules where appropriate.
- When quoting Scripture, use blockquotes (> ) to set them apart visually.
## Non-Canonical Books

The app also contains the texts of 1 Enoch, Jubilees, and Psalm 151. These are available through the read_passage tool for users who wish to study them. Do NOT treat these as canonical Scripture or quote them as authoritative alongside the Bible. They are there for advanced study only.

When a user asks about these books, always provide honest historical context:
- **1 Enoch**: A collection of Jewish apocalyptic writings attributed to Enoch (Genesis 5:24), composed in five sections between roughly the 3rd century BC and 1st century AD. Jude 14-15 directly quotes from 1 Enoch 1:9, and 2 Peter 2:4 may allude to it. Found among the Dead Sea Scrolls at Qumran in eleven Aramaic manuscript copies across multiple caves. It was widely read in Second Temple Judaism. Still canonical in the Ethiopian and Eritrean Orthodox Tewahedo Churches, but was never accepted into the Hebrew Bible, the Protestant canon, the Catholic canon, or the Eastern Orthodox canon. Early church fathers like Tertullian and Clement of Alexandria valued it, while others like Augustine concluded against its canonical status. By the 4th century it had largely fallen out of use in the broader church.
- **Jubilees**: Also called "Little Genesis." A retelling of Genesis through the early chapters of Exodus (up to the Sinai theophany), dated around 160-150 BC. Found in approximately fifteen copies among the Dead Sea Scrolls across five caves at Qumran — more copies than most biblical books — indicating it was highly valued by the Qumran community. Canonical in the Ethiopian and Eritrean Orthodox Tewahedo Churches. Not accepted in the Protestant, Catholic, or Eastern Orthodox canons.
- **Psalm 151**: A short psalm attributed to David about his anointing by Samuel and his victory over Goliath. Found in the Septuagint (LXX) as the final psalm and in the Dead Sea Scrolls (11QPsa). The Dead Sea Scrolls preserve a longer Hebrew version (two compositions, Psalm 151A and 151B) that was later condensed into the shorter Greek version in the Septuagint. Accepted as canonical in the Eastern Orthodox tradition and the Ethiopian and Eritrean Orthodox Tewahedo Churches. Not in the Protestant or Catholic canons.

Make clear that these books are not part of the 66-book Protestant canon. They were excluded for specific reasons — explain those reasons honestly when asked. Their value is historical and contextual: they show what Jews believed and discussed in the centuries between the Old and New Testaments, and they sometimes illuminate the background of canonical passages.

Original language source texts available:
- Hebrew OT: Use translation "WLC" (Westminster Leningrad Codex) — the Masoretic Text from the Leningrad Codex (1008 CE), the base text virtually all OT translations derive from.
- Greek NT (critical): Use translation "SBLGNT" (SBL Greek New Testament) — based on the oldest manuscripts (2nd-4th century papyri, Codex Sinaiticus, Codex Vaticanus). This is what modern translations (NIV, ESV, NASB) translate from.
- Greek NT (traditional): Use translation "TR" (Textus Receptus, 1624) — the text behind the KJV.
- Septuagint: Use translation "LXX" — the ancient Greek translation of the OT.
When users ask about original languages, word meanings, or textual differences, use these source texts. You can compare SBLGNT vs TR to show textual variants.
- When the user has multiple Bible panels open, read_passage automatically returns the same verses from all open panels. You don't need to call read_passage multiple times for different translations — one call gives you all panels.
- Use include_source_text: true when the user wants to study from original languages or compare with the source text. This automatically adds Hebrew (WLC) for OT or Greek (SBLGNT) for NT alongside whatever translation the user is reading.
- You can open new Bible panels in the user's split-screen view using the open_bible_panel tool. Use this when the user asks to "open", "show", or "pull up" a Bible, translation, or passage. For example, if they say "open the Greek for John 1", use open_bible_panel with translation "SBLGNT", book_name "John", chapter 1.

## Presentation Canvas

You have a Presentation tab available to create visual content for the user. Use the write_presentation tool when the user asks for:
- Sermon outlines or sermon slides
- Teaching materials or study guides
- Visual aids for Bible study
- Presentation handouts
- Any formatted visual content for ministry use

The presentation system supports two modes:

### Document Mode (mode: "document")
A single HTML document — ideal for sermon outlines, study guides, handouts, and print-ready materials.

When writing document HTML:
- Write a complete HTML document with <html>, <head>, <style>, and <body> tags
- Use clean, professional typography — system font stack (e.g., -apple-system, 'Segoe UI', sans-serif) or import Google Fonts via @import
- Use warm, ministry-appropriate colors. Suggested palette: warm golds (#C8902E), deep wines (#7B2D3B), olive greens (#7A8B5C), cream backgrounds (#FAF5EB), dark brown text (#3B2A1A)
- Structure content with clear visual hierarchy using headings, spacing, and subtle dividers
- For sermon outlines: use numbered points, Scripture references in italic, and clear section breaks
- Make it print-friendly when appropriate
- You can use JavaScript for interactive features if needed

### Slides Mode (mode: "slides")
A multi-slide presentation — ideal for sermon slides, teaching decks, and visual presentations. Each slide is a separate HTML body fragment sharing a common theme CSS.

When writing slides:
- Provide a theme_css string with shared CSS for all slides (typography, colors, layout classes)
- Each slide's html is a body fragment (no <html>/<head> — just the content)
- Use large text sizes — minimum 24px body, 36-48px headings. Slides are meant to be viewed, not read
- Keep each slide focused on one idea or point
- Typical presentations have 5-12 slides
- Include a title slide as the first slide
- Use the theme CSS for consistent styling across all slides
- Suggested slide layout: centered content, generous padding (40-60px), ample whitespace

### Choosing Between Modes

When the user asks you to create a presentation and doesn't specify a format, **ask them** whether they'd like:
1. **A document** — a single-page formatted outline or handout (good for printing, study guides, detailed notes)
2. **A slideshow** — a multi-slide deck they can click through (good for projection, teaching, sermon slides)

If the user says "slides", "slideshow", "presentation deck", or "slide deck", use slides mode. If they say "outline", "handout", "study guide", or "document", use document mode. If it's ambiguous, ask.

To modify an existing presentation, use read_presentation first to see the current content with line numbers, then use edit_presentation to make changes. This is much more efficient than rewriting everything with write_presentation. Use edit_presentation for small changes (updating text, fixing styles, adding a slide, removing a slide) and write_presentation only when creating from scratch or doing a full rewrite.

### Managing Multiple Presentations

The user can have multiple saved presentations. Use these tools to manage them:
- **list_presentations**: See all saved presentations with their IDs, titles, and modes.
- **presentation_id parameter**: All presentation tools (write, read, edit) accept an optional \`presentation_id\`. Use an existing presentation's ID to target it specifically, or use \`"new"\` with write_presentation to create a brand new presentation.
- If you omit \`presentation_id\`, the tool operates on the currently active presentation.
- **Important**: If you target a presentation that isn't currently active (via read_presentation or edit_presentation), the system will switch to it automatically. However, the content won't be available until the user's next message — so tell the user you've loaded it and ask what they'd like to do.
- For write_presentation, you can write to any presentation ID immediately since you provide the full content.`;


// Build the available translations list from the database at startup
const allTranslations = queries.translations.all() as Array<{
  short_name: string;
  full_name: string;
  language: string;
}>;
const translationList = allTranslations
  .map((t) => `${t.short_name} (${t.full_name})`)
  .join(", ");

const TOOLS: Anthropic.Tool[] = [
  {
    name: "read_passage",
    description:
      "Read verses from the Bible, original language source texts, or non-canonical books. Use this to look up specific passages, verify quotes, or explore cross-references. You can read a full chapter or a specific verse range. Non-canonical books available: 1 Enoch, Jubilees, Psalm 151. When include_source_text is true, the original Hebrew (WLC) or Greek (SBLGNT) is returned alongside the translation. When the user has multiple Bible panels open, the same verses from all open panels are returned automatically.",
    input_schema: {
      type: "object" as const,
      properties: {
        translation: {
          type: "string",
          description:
            `Bible translation code. Use the same translation the user is reading unless they ask for a different one. Available translations: ${translationList}`,
        },
        book_name: {
          type: "string",
          description:
            'Book name (e.g., "Genesis", "Matthew", "1 Corinthians"). Use the standard English name.',
        },
        chapter: {
          type: "number",
          description: "Chapter number.",
        },
        from_verse: {
          type: "number",
          description:
            "Starting verse number (inclusive). Omit to start from verse 1.",
        },
        to_verse: {
          type: "number",
          description:
            "Ending verse number (inclusive). Omit to read to the end of the chapter.",
        },
        include_cross_refs: {
          type: "boolean",
          description:
            "Whether to include cross-references for the verses read. Defaults to false.",
        },
        include_source_text: {
          type: "boolean",
          description:
            "When true, also returns the original language source text alongside the translation: Hebrew (WLC) for OT books, Greek (SBLGNT) for NT books. Use this when the user wants to study from the original languages, compare translations, or do word studies.",
        },
      },
      required: ["translation", "book_name", "chapter"],
    },
  },
  {
    name: "open_bible_panel",
    description:
      "Open a new Bible panel in the user's split-screen view. Use this when the user asks you to open or show a specific Bible, translation, or passage in a new panel. This creates a visible Bible reader panel — the user can then browse from there. Only use this when the user explicitly asks to open/show a Bible or passage in a new panel.",
    input_schema: {
      type: "object" as const,
      properties: {
        translation: {
          type: "string",
          description:
            `Bible translation code to open. Available translations: ${translationList}`,
        },
        book_name: {
          type: "string",
          description:
            'Book name to open to (e.g., "Genesis", "John"). Use the standard English name.',
        },
        chapter: {
          type: "number",
          description: "Chapter number to open to. Defaults to 1.",
        },
      },
      required: ["translation", "book_name"],
    },
  },
  {
    name: "list_presentations",
    description:
      "List all saved presentations. Returns an array of presentations with their IDs, titles, and modes. Use this to find a specific presentation before working on it.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "read_presentation",
    description:
      "Read a presentation's content with line numbers. Use this before calling edit_presentation so you know which lines to change. In document mode, returns the full HTML. In slides mode, specify target: 'outline' (list of slide titles), 'slide' (one slide's HTML), or 'theme' (the shared CSS). Use presentation_id to target a specific saved presentation.",
    input_schema: {
      type: "object" as const,
      properties: {
        presentation_id: {
          type: "string",
          description:
            "ID of the presentation to read. Omit to read the currently active presentation. If the targeted presentation is not active, it will be switched to automatically (content available on next message).",
        },
        target: {
          type: "string",
          enum: ["outline", "slide", "theme"],
          description:
            "What to read in slides mode: 'outline' returns [{index, title}] for all slides, 'slide' returns one slide's HTML with line numbers, 'theme' returns the shared CSS with line numbers. Omit for document mode.",
        },
        slide_number: {
          type: "number",
          description:
            "Which slide to read (1-based). Required when target is 'slide'.",
        },
      },
      required: [],
    },
  },
  {
    name: "edit_presentation",
    description:
      "Edit a presentation. Actions: 'edit_lines' replaces a range of lines (in document HTML, a specific slide, or the theme CSS). 'add_slide' inserts a new slide. 'remove_slide' removes a slide. Use read_presentation first to see line numbers before using edit_lines. Use presentation_id to target a specific saved presentation.",
    input_schema: {
      type: "object" as const,
      properties: {
        presentation_id: {
          type: "string",
          description:
            "ID of the presentation to edit. Omit to edit the currently active presentation. If the targeted presentation is not active, it will be switched to automatically (content available on next message).",
        },
        action: {
          type: "string",
          enum: ["edit_lines", "add_slide", "remove_slide"],
          description:
            "The edit action to perform.",
        },
        start_line: {
          type: "number",
          description: "First line number to replace (1-based, inclusive). For edit_lines action.",
        },
        end_line: {
          type: "number",
          description: "Last line number to replace (1-based, inclusive). For edit_lines action.",
        },
        new_content: {
          type: "string",
          description:
            "The new content to insert in place of the specified lines. Can be multiple lines. Use empty string to delete lines. For edit_lines action.",
        },
        slide_number: {
          type: "number",
          description: "The slide to edit (1-based) for edit_lines with target 'slide', or the slide to remove for remove_slide action.",
        },
        target: {
          type: "string",
          enum: ["slide", "theme"],
          description: "What to edit in slides mode: 'slide' (a specific slide's HTML) or 'theme' (the shared CSS). For edit_lines action in slides mode.",
        },
        after: {
          type: "number",
          description: "Position to insert the new slide after (0 = beginning, 1 = after first slide, etc.). For add_slide action.",
        },
        title: {
          type: "string",
          description: "Title for the new slide. For add_slide action.",
        },
        html: {
          type: "string",
          description: "HTML body fragment for the new slide. For add_slide action.",
        },
      },
      required: ["action"],
    },
  },
  {
    name: "write_presentation",
    description:
      "Write content to the Presentation canvas. Use mode 'document' for a single HTML document (sermon outlines, study guides, handouts). Use mode 'slides' for a multi-slide presentation (sermon slides, teaching decks). In document mode, provide html with a complete HTML document. In slides mode, provide theme_css (shared CSS) and slides (array of {title, html} body fragments). Use presentation_id to target a specific saved presentation or 'new' to create a brand new one.",
    input_schema: {
      type: "object" as const,
      properties: {
        presentation_id: {
          type: "string",
          description:
            "ID of the presentation to overwrite, or 'new' to create a new presentation. Omit to overwrite the currently active presentation.",
        },
        title: {
          type: "string",
          description:
            "Title for the presentation, shown in the title bar above the canvas.",
        },
        mode: {
          type: "string",
          enum: ["document", "slides"],
          description:
            "Presentation mode: 'document' for a single HTML page, 'slides' for a multi-slide deck.",
        },
        html: {
          type: "string",
          description:
            "Complete HTML document (document mode only). Must be a full standalone page with <html>, <head> (with <style>), and <body> tags.",
        },
        theme_css: {
          type: "string",
          description:
            "Shared CSS for all slides (slides mode only). Define typography, colors, and layout classes here.",
        },
        slides: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "Slide title." },
              html: { type: "string", description: "Slide body HTML fragment (no <html>/<head> — just content)." },
            },
            required: ["title", "html"],
          },
          description:
            "Array of slides (slides mode only). Each slide has a title and an HTML body fragment.",
        },
      },
      required: ["title", "mode"],
    },
  },
];

type PanelInfo = {
  translation: string;
  bookName: string;
  chapter: number;
};

type IncomingToolCall = {
  name: string;
  args: Record<string, unknown>;
  result?: Record<string, unknown>;
};

type IncomingMessage = {
  role: "user" | "assistant";
  content: string;
  toolCalls?: IncomingToolCall[];
};

function buildContextBlock(panels: PanelInfo[]): string {
  if (!panels || panels.length === 0) return "";

  const lines = panels.map(
    (p, i) => `- Panel ${i + 1}: ${p.bookName} ${p.chapter} (${p.translation})`
  );
  return `The user currently has the following Bible panels open:\n${lines.join("\n")}`;
}

// Non-canonical books live under "ENC" translation in the DB
const NC_TRANSLATION = "ENC";
const NC_MIN_BOOK_ID = 90;

function resolveTranslation(translation: string, bookId: number): string {
  return bookId >= NC_MIN_BOOK_ID ? NC_TRANSLATION : translation;
}

/**
 * Fetch verses for a single translation. Returns null if book not found.
 */
function fetchVerses(
  translation: string,
  bookId: number,
  chapter: number,
  fromVerse?: number,
  toVerse?: number
): Array<{ verse: number; text: string }> | null {
  const effectiveTranslation = resolveTranslation(translation, bookId);

  let verses: Array<{ verse: number; text: string }>;
  if (fromVerse && toVerse) {
    verses = queries.verseRange.all(effectiveTranslation, bookId, chapter, fromVerse, toVerse) as Array<{ verse: number; text: string }>;
  } else if (fromVerse) {
    verses = queries.verseRange.all(effectiveTranslation, bookId, chapter, fromVerse, 999) as Array<{ verse: number; text: string }>;
  } else {
    verses = queries.chapter.all(effectiveTranslation, bookId, chapter) as Array<{ verse: number; text: string }>;
  }

  return verses.length > 0 ? verses : null;
}

/**
 * Determine the original language source translation for a book.
 * OT (books 1-39) → WLC (Hebrew), NT (books 40-66) → SBLGNT (Greek).
 */
function getSourceTranslation(bookId: number): { code: string; label: string } {
  if (bookId >= 40 && bookId <= 66) {
    return { code: "SBLGNT", label: "Greek (SBLGNT)" };
  }
  return { code: "WLC", label: "Hebrew (WLC)" };
}

function executeReadPassage(
  input: {
    translation: string;
    book_name: string;
    chapter: number;
    from_verse?: number;
    to_verse?: number;
    include_cross_refs?: boolean;
    include_source_text?: boolean;
  },
  panels: PanelInfo[]
): string {
  const { translation, book_name, chapter, from_verse, to_verse, include_cross_refs, include_source_text } = input;

  // Resolve book name to book_id (try requested translation first, then ENC for non-canonical)
  let book = queries.bookByName.get(translation, book_name) as
    | { book_id: number; name: string; chapters: number }
    | undefined;

  if (!book) {
    book = queries.bookByName.get(NC_TRANSLATION, book_name) as
      | { book_id: number; name: string; chapters: number }
      | undefined;
  }

  if (!book) {
    return JSON.stringify({
      error: `Book "${book_name}" not found in ${translation} translation.`,
    });
  }

  // Primary translation verses
  const primaryVerses = fetchVerses(translation, book.book_id, chapter, from_verse, to_verse);
  if (!primaryVerses) {
    return JSON.stringify({
      error: `No verses found for ${book_name} ${chapter} in ${translation}.`,
    });
  }

  const refStr = `${book.name} ${chapter}${from_verse ? `:${from_verse}` : ""}${to_verse ? `-${to_verse}` : ""}`;

  const result: Record<string, unknown> = {
    reference: refStr,
    translation,
    verses: primaryVerses,
  };

  // Include source text (Hebrew or Greek) if requested
  if (include_source_text && book.book_id < NC_MIN_BOOK_ID) {
    const source = getSourceTranslation(book.book_id);
    if (source.code !== translation) {
      const sourceVerses = fetchVerses(source.code, book.book_id, chapter, from_verse, to_verse);
      if (sourceVerses) {
        result.source_text = {
          translation: source.code,
          label: source.label,
          verses: sourceVerses,
        };
      }
    }
  }

  // Also return the same passage from all other open panels
  const otherPanels: Array<{ translation: string; verses: Array<{ verse: number; text: string }> }> = [];
  for (const panel of panels) {
    // Skip the same translation we already fetched, and skip if different book/chapter
    if (panel.translation === translation) continue;

    // Try to find this book in the panel's translation
    const panelBook = queries.bookByName.get(panel.translation, book_name) as
      | { book_id: number; name: string; chapters: number }
      | undefined;
    if (!panelBook) continue;

    const panelVerses = fetchVerses(panel.translation, panelBook.book_id, chapter, from_verse, to_verse);
    if (panelVerses) {
      otherPanels.push({ translation: panel.translation, verses: panelVerses });
    }
  }

  if (otherPanels.length > 0) {
    result.other_panels = otherPanels;
  }

  // Cross-references
  if (include_cross_refs) {
    const startV = from_verse || 1;
    const endV = to_verse || 999;
    const effectiveTranslation = resolveTranslation(translation, book.book_id);
    const crossRefs = queries.crossRefsForRange.all(
      effectiveTranslation, book.book_id, chapter, startV, endV
    ) as Array<{
      from_verse: number;
      to_book: number;
      to_chapter: number;
      to_verse: number;
      to_end_verse: number | null;
      relevance: number;
      book_name: string;
    }>;

    result.cross_references = crossRefs.map((cr) => ({
      from_verse: cr.from_verse,
      reference: `${cr.book_name} ${cr.to_chapter}:${cr.to_verse}${cr.to_end_verse ? `-${cr.to_end_verse}` : ""}`,
      relevance: cr.relevance,
    }));
  }

  return JSON.stringify(result);
}

/**
 * Convert flat frontend messages into proper Anthropic conversation format.
 * Assistant messages with tool calls expand into:
 *   1. assistant: [tool_use blocks]
 *   2. user: [tool_result blocks]
 *   3. assistant: text content (if any)
 * Thinking blocks are never included in history.
 */
function reconstructAnthropicHistory(
  messages: IncomingMessage[]
): Anthropic.MessageParam[] {
  const result: Anthropic.MessageParam[] = [];
  let toolIdCounter = 0;

  for (const msg of messages) {
    if (msg.role === "user") {
      result.push({ role: "user", content: msg.content });
    } else if (msg.role === "assistant") {
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        // Generate stable IDs for tool_use / tool_result pairing
        const toolIds = msg.toolCalls.map(() => `hist_${toolIdCounter++}`);

        const toolUseBlocks: Anthropic.ToolUseBlock[] = msg.toolCalls.map(
          (tc, i) => ({
            type: "tool_use" as const,
            id: toolIds[i],
            name: tc.name,
            input: tc.args,
          })
        );

        result.push({ role: "assistant", content: toolUseBlocks });

        const toolResultBlocks: Anthropic.ToolResultBlockParam[] = msg.toolCalls.map(
          (tc, i) => ({
            type: "tool_result" as const,
            tool_use_id: toolIds[i],
            content: tc.result ? JSON.stringify(tc.result) : "No result",
          })
        );

        result.push({ role: "user", content: toolResultBlocks });

        // Add the final text response after tool processing
        if (msg.content) {
          result.push({ role: "assistant", content: msg.content });
        }
      } else {
        result.push({ role: "assistant", content: msg.content });
      }
    }
  }

  return result;
}

/**
 * Strip thinking blocks from an Anthropic content block array.
 * Used to clean assistant messages before adding them back to the conversation
 * during the tool loop (Claude shouldn't see its own thinking in history).
 */
function stripThinking(
  content: Anthropic.ContentBlock[]
): (Anthropic.TextBlock | Anthropic.ToolUseBlock)[] {
  return content.filter(
    (block): block is Anthropic.TextBlock | Anthropic.ToolUseBlock =>
      block.type !== "thinking"
  );
}

/**
 * Trim conversation messages from the start so the total input tokens
 * fit within TOKEN_BUDGET. Uses the Anthropic token counting API.
 * Always preserves at least the last message.
 */
async function trimToTokenBudget(
  messages: Anthropic.MessageParam[],
  systemMessages: Anthropic.TextBlockParam[]
): Promise<Anthropic.MessageParam[]> {
  if (messages.length <= 1) return messages;

  let trimmed = messages;

  let { input_tokens } = await anthropic.messages.countTokens({
    model: "claude-haiku-4-5-20251001",
    system: systemMessages,
    messages: trimmed,
    tools: TOOLS,
    thinking: { type: "enabled", budget_tokens: 7000 },
  });

  if (input_tokens <= TOKEN_BUDGET) {
    logger.info(`Token count: ${input_tokens} (within budget)`);
    return trimmed;
  }

  logger.info(`Token count: ${input_tokens} — exceeds ${TOKEN_BUDGET}, trimming history`);

  // Estimate how many messages to remove in first pass
  const tokensPerMsg = input_tokens / trimmed.length;
  const tokensToRemove = input_tokens - TOKEN_BUDGET;
  let removeCount = Math.ceil(tokensToRemove / tokensPerMsg) + 1;

  while (input_tokens > TOKEN_BUDGET && trimmed.length > 1) {
    const actualRemove = Math.max(1, Math.min(removeCount, trimmed.length - 1));
    trimmed = trimmed.slice(actualRemove);

    // Ensure the conversation starts with a user message
    while (trimmed.length > 1 && trimmed[0].role !== "user") {
      trimmed = trimmed.slice(1);
    }

    ({ input_tokens } = await anthropic.messages.countTokens({
      model: "claude-haiku-4-5-20251001",
      system: systemMessages,
      messages: trimmed,
      tools: TOOLS,
      thinking: { type: "enabled", budget_tokens: 7000 },
    }));

    // Subsequent passes remove one at a time
    removeCount = 1;
  }

  logger.info(`Trimmed to ${trimmed.length} messages (${input_tokens} tokens)`);
  return trimmed;
}

type SlideData = { title: string; html: string };
type PresentationData = {
  mode: "document" | "slides";
  html: string;
  themeCss: string;
  slides: SlideData[];
};

type PresentationSummary = { id: string; title: string; mode: string };

chat.post("/", async (c) => {
  const body = await c.req.json();
  const { messages, panels, presentation: clientPresentation, presentationSummaries: clientSummaries } = body as {
    messages: IncomingMessage[];
    panels: PanelInfo[];
    presentation?: { id?: string; mode?: string; html?: string; themeCss?: string; slides?: SlideData[] };
    presentationSummaries?: PresentationSummary[];
  };

  // Presentation summaries for list_presentations tool
  const presentationSummaries: PresentationSummary[] = clientSummaries || [];

  // ID of the currently active presentation (null if unsaved/none)
  const activePresentationId: string | null = clientPresentation?.id || null;

  // Mutable presentation state for read/edit tools within this request
  const currentPresentation: PresentationData = {
    mode: (clientPresentation?.mode === "slides" ? "slides" : "document") as "document" | "slides",
    html: clientPresentation?.html || "",
    themeCss: clientPresentation?.themeCss || "",
    slides: clientPresentation?.slides || [],
  };
  // Track the title from write_presentation calls
  let currentPresentationTitle = "";

  // Build lightweight context (just panel metadata, no full text)
  const contextBlock = buildContextBlock(panels || []);

  const systemMessages: Anthropic.TextBlockParam[] = [
    {
      type: "text" as const,
      text: SYSTEM_PROMPT,
      cache_control: { type: "ephemeral" as const },
    },
  ];

  if (contextBlock) {
    systemMessages.push({
      type: "text" as const,
      text: contextBlock,
      cache_control: { type: "ephemeral" as const },
    });
  }

  return streamSSE(c, async (stream) => {
    try {
      // Reconstruct full Anthropic conversation with tool use history
      let conversationMessages = reconstructAnthropicHistory(messages);

      // Trim to fit within token budget
      conversationMessages = await trimToTokenBudget(
        conversationMessages,
        systemMessages
      );

      // Tool use loop — Claude may call tools multiple times
      const MAX_TOOL_ROUNDS = 5;
      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const response = anthropic.messages.stream({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 64000,
          thinking: {
            type: "enabled",
            budget_tokens: 7000,
          },
          system: systemMessages,
          messages: conversationMessages,
          tools: TOOLS,
        });

        // Track tool_use blocks as they stream in
        const streamingTools: Map<number, { name: string; inputJson: string }> = new Map();
        let lastPresentationStreamTime = 0;
        const PRESENTATION_STREAM_INTERVAL = 400; // ms between streaming updates

        // Stream text/thinking/tool events to the client
        for await (const event of response) {
          if (event.type === "content_block_start") {
            if (event.content_block.type === "tool_use") {
              // Tool name is available immediately — notify the client
              streamingTools.set(event.index, {
                name: event.content_block.name,
                inputJson: "",
              });
              await stream.writeSSE({
                event: "tool_call_start",
                data: JSON.stringify({ name: event.content_block.name }),
              });
            }
          } else if (event.type === "content_block_delta") {
            if (event.delta.type === "text_delta") {
              await stream.writeSSE({
                event: "text",
                data: event.delta.text,
              });
            } else if (event.delta.type === "thinking_delta") {
              await stream.writeSSE({
                event: "thinking",
                data: event.delta.thinking,
              });
            } else if (event.delta.type === "input_json_delta") {
              const tool = streamingTools.get(event.index);
              if (tool) {
                tool.inputJson += event.delta.partial_json;

                // For write_presentation in document mode, stream partial HTML to the canvas (throttled)
                // Skip streaming for slides mode (too complex to parse partial array JSON)
                if (tool.name === "write_presentation") {
                  const isSlidesMode = /"mode"\s*:\s*"slides"/.test(tool.inputJson);
                  if (!isSlidesMode) {
                    const now = Date.now();
                    if (now - lastPresentationStreamTime >= PRESENTATION_STREAM_INTERVAL) {
                      lastPresentationStreamTime = now;
                      // Extract partial HTML from accumulated JSON so far
                      // JSON looks like: {"title": "...", "mode": "document", "html": "<html>..."}
                      const htmlMatch = tool.inputJson.match(/"html"\s*:\s*"/);
                      if (htmlMatch) {
                        const start = htmlMatch.index! + htmlMatch[0].length;
                        // Take everything after "html": " — it's partial and may be unterminated
                        let partialHtml = tool.inputJson.slice(start);
                        // Remove trailing incomplete JSON (closing quote + rest)
                        if (partialHtml.endsWith('"}') || partialHtml.endsWith('",')) {
                          partialHtml = partialHtml.slice(0, -2);
                        } else if (partialHtml.endsWith('"')) {
                          partialHtml = partialHtml.slice(0, -1);
                        }
                        // Unescape JSON string escapes
                        try {
                          partialHtml = JSON.parse(`"${partialHtml}"`);
                        } catch {
                          // If it fails to parse, use raw (some escapes may be broken mid-stream)
                          partialHtml = partialHtml.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
                        }
                        await stream.writeSSE({
                          event: "presentation_streaming",
                          data: JSON.stringify({ html: partialHtml }),
                        });
                      }
                    }
                  }
                }
              }
            }
          }
        }

        // Get the final message to check for tool use
        const finalMessage = await response.finalMessage();
        const stopReason = finalMessage.stop_reason;

        if (stopReason !== "tool_use") {
          // No tool calls — we're done
          await stream.writeSSE({ event: "done", data: "[DONE]" });
          break;
        }

        // Extract tool use blocks and execute them
        const toolUseBlocks = finalMessage.content.filter(
          (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
        );

        if (toolUseBlocks.length === 0) {
          await stream.writeSSE({ event: "done", data: "[DONE]" });
          break;
        }

        // Add assistant message to history — strip thinking blocks
        conversationMessages.push({
          role: "assistant",
          content: stripThinking(finalMessage.content),
        });

        // Execute each tool and send events to the client
        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const toolUse of toolUseBlocks) {
          // Notify the client about this tool call
          await stream.writeSSE({
            event: "tool_call",
            data: JSON.stringify({
              name: toolUse.name,
              args: toolUse.input,
            }),
          });

          let result: string;
          if (toolUse.name === "read_passage") {
            result = executeReadPassage(toolUse.input as any, panels || []);
          } else if (toolUse.name === "open_bible_panel") {
            const input = toolUse.input as { translation: string; book_name: string; chapter?: number };
            // Resolve book to get book_id
            let book = queries.bookByName.get(input.translation, input.book_name) as
              | { book_id: number; name: string; chapters: number }
              | undefined;
            if (!book) {
              // Try KJV for English name fallback
              book = queries.bookByName.get("KJV", input.book_name) as
                | { book_id: number; name: string; chapters: number }
                | undefined;
            }
            if (!book) {
              result = JSON.stringify({ error: `Book "${input.book_name}" not found.` });
            } else {
              const chapter = input.chapter || 1;
              // Send open_panel event to the client
              await stream.writeSSE({
                event: "open_panel",
                data: JSON.stringify({
                  translation: input.translation,
                  bookId: book.book_id,
                  bookName: book.name,
                  chapter,
                }),
              });
              result = JSON.stringify({ success: true, opened: `${book.name} ${chapter} (${input.translation})` });
            }
          } else if (toolUse.name === "list_presentations") {
            const list = presentationSummaries.map((p) => ({
              id: p.id,
              title: p.title,
              mode: p.mode || "document",
              active: p.id === activePresentationId,
            }));
            if (list.length === 0) {
              result = JSON.stringify({ message: "No saved presentations yet. Use write_presentation to create one." });
            } else {
              result = JSON.stringify({
                total: list.length,
                active_presentation_id: activePresentationId || null,
                presentations: list,
              });
            }
          } else if (toolUse.name === "read_presentation") {
            const input = toolUse.input as { presentation_id?: string; target?: string; slide_number?: number };

            // Check if targeting a non-active presentation
            if (input.presentation_id && input.presentation_id !== activePresentationId) {
              const target = presentationSummaries.find((p) => p.id === input.presentation_id);
              const targetName = target?.title || input.presentation_id;
              // Send switch event to frontend
              await stream.writeSSE({
                event: "switch_presentation",
                data: JSON.stringify({ presentationId: input.presentation_id }),
              });
              result = JSON.stringify({
                message: `Switching to presentation "${targetName}". The content will be loaded and available on your next message. Tell the user you've loaded it and ask what they'd like to do.`,
              });
            } else {
            // Operating on the active presentation
            if (currentPresentation.mode === "slides") {
              // Slides mode
              if (!input.target) {
                result = JSON.stringify({ error: "Slides mode: specify target ('outline', 'slide', or 'theme')." });
              } else if (input.target === "outline") {
                if (currentPresentation.slides.length === 0) {
                  result = JSON.stringify({ message: "No slides exist yet. Use write_presentation to create slides." });
                } else {
                  const outline = currentPresentation.slides.map((s, i) => ({ index: i + 1, title: s.title }));
                  result = JSON.stringify({ mode: "slides", total_slides: currentPresentation.slides.length, outline });
                }
              } else if (input.target === "slide") {
                const num = input.slide_number;
                if (!num || num < 1 || num > currentPresentation.slides.length) {
                  result = JSON.stringify({ error: `Invalid slide_number. There are ${currentPresentation.slides.length} slides (1-based).` });
                } else {
                  const slide = currentPresentation.slides[num - 1]!;
                  const lines = slide.html.split("\n");
                  const numbered = lines.map((line, i) => `${i + 1}\t${line}`).join("\n");
                  result = JSON.stringify({ mode: "slides", slide_number: num, title: slide.title, total_lines: lines.length, content: numbered });
                }
              } else if (input.target === "theme") {
                if (!currentPresentation.themeCss) {
                  result = JSON.stringify({ message: "No theme CSS exists yet." });
                } else {
                  const lines = currentPresentation.themeCss.split("\n");
                  const numbered = lines.map((line, i) => `${i + 1}\t${line}`).join("\n");
                  result = JSON.stringify({ mode: "slides", total_lines: lines.length, content: numbered });
                }
              } else {
                result = JSON.stringify({ error: "Invalid target. Use 'outline', 'slide', or 'theme'." });
              }
            } else {
              // Document mode
              if (!currentPresentation.html) {
                result = JSON.stringify({ message: "No presentation exists yet. Use write_presentation to create one." });
              } else {
                const lines = currentPresentation.html.split("\n");
                const numbered = lines.map((line, i) => `${i + 1}\t${line}`).join("\n");
                result = JSON.stringify({ mode: "document", total_lines: lines.length, content: numbered });
              }
            }
            } // end else (active presentation)
          } else if (toolUse.name === "edit_presentation") {
            const input = toolUse.input as {
              presentation_id?: string;
              action: string;
              start_line?: number; end_line?: number; new_content?: string;
              slide_number?: number; target?: string;
              after?: number; title?: string; html?: string;
            };

            // Check if targeting a non-active presentation
            if (input.presentation_id && input.presentation_id !== activePresentationId) {
              const target = presentationSummaries.find((p) => p.id === input.presentation_id);
              const targetName = target?.title || input.presentation_id;
              await stream.writeSSE({
                event: "switch_presentation",
                data: JSON.stringify({ presentationId: input.presentation_id }),
              });
              result = JSON.stringify({
                message: `Switching to presentation "${targetName}". The content will be loaded and available on your next message. Tell the user you've loaded it and ask what they'd like to do.`,
              });
            } else {
            // Operating on active presentation

            if (input.action === "edit_lines") {
              if (currentPresentation.mode === "slides" && input.target === "slide") {
                // Edit a specific slide's HTML
                const num = input.slide_number;
                if (!num || num < 1 || num > currentPresentation.slides.length) {
                  result = JSON.stringify({ error: `Invalid slide_number. There are ${currentPresentation.slides.length} slides.` });
                } else {
                  const lines = currentPresentation.slides[num - 1]!.html.split("\n");
                  const start = Math.max(1, Math.min(input.start_line || 1, lines.length));
                  const end = Math.max(start, Math.min(input.end_line || start, lines.length));
                  const newLines = input.new_content ? input.new_content.split("\n") : [];
                  lines.splice(start - 1, end - start + 1, ...newLines);
                  currentPresentation.slides[num - 1] = { ...currentPresentation.slides[num - 1]!, html: lines.join("\n") };

                  await stream.writeSSE({
                    event: "presentation_update",
                    data: JSON.stringify({
                      mode: "slides", title: currentPresentationTitle,
                      themeCss: currentPresentation.themeCss, slides: currentPresentation.slides,
                    }),
                  });
                  result = JSON.stringify({ success: true, message: `Slide ${num}: replaced lines ${start}-${end} with ${newLines.length} new line(s).`, total_lines: lines.length });
                }
              } else if (currentPresentation.mode === "slides" && input.target === "theme") {
                // Edit theme CSS
                const lines = (currentPresentation.themeCss || "").split("\n");
                const start = Math.max(1, Math.min(input.start_line || 1, lines.length));
                const end = Math.max(start, Math.min(input.end_line || start, lines.length));
                const newLines = input.new_content ? input.new_content.split("\n") : [];
                lines.splice(start - 1, end - start + 1, ...newLines);
                currentPresentation.themeCss = lines.join("\n");

                await stream.writeSSE({
                  event: "presentation_update",
                  data: JSON.stringify({
                    mode: "slides", title: currentPresentationTitle,
                    themeCss: currentPresentation.themeCss, slides: currentPresentation.slides,
                  }),
                });
                result = JSON.stringify({ success: true, message: `Theme CSS: replaced lines ${start}-${end} with ${newLines.length} new line(s).`, total_lines: lines.length });
              } else {
                // Document mode edit_lines
                if (!currentPresentation.html) {
                  result = JSON.stringify({ error: "No presentation exists yet. Use write_presentation to create one first." });
                } else {
                  const lines = currentPresentation.html.split("\n");
                  const start = Math.max(1, Math.min(input.start_line || 1, lines.length));
                  const end = Math.max(start, Math.min(input.end_line || start, lines.length));
                  const newLines = input.new_content ? input.new_content.split("\n") : [];
                  lines.splice(start - 1, end - start + 1, ...newLines);
                  currentPresentation.html = lines.join("\n");

                  await stream.writeSSE({
                    event: "presentation_update",
                    data: JSON.stringify({
                      mode: "document", title: currentPresentationTitle,
                      html: currentPresentation.html,
                    }),
                  });
                  result = JSON.stringify({ success: true, message: `Replaced lines ${start}-${end} with ${newLines.length} new line(s). Presentation updated.`, total_lines: lines.length });
                }
              }
            } else if (input.action === "add_slide") {
              if (currentPresentation.mode !== "slides") {
                result = JSON.stringify({ error: "add_slide is only available in slides mode." });
              } else {
                const after = input.after ?? currentPresentation.slides.length;
                const newSlide: SlideData = { title: input.title || "Untitled Slide", html: input.html || "" };
                currentPresentation.slides.splice(after, 0, newSlide);

                await stream.writeSSE({
                  event: "presentation_update",
                  data: JSON.stringify({
                    mode: "slides", title: currentPresentationTitle,
                    themeCss: currentPresentation.themeCss, slides: currentPresentation.slides,
                  }),
                });
                result = JSON.stringify({ success: true, message: `Added slide "${newSlide.title}" at position ${after + 1}. Total slides: ${currentPresentation.slides.length}.` });
              }
            } else if (input.action === "remove_slide") {
              if (currentPresentation.mode !== "slides") {
                result = JSON.stringify({ error: "remove_slide is only available in slides mode." });
              } else {
                const num = input.slide_number;
                if (!num || num < 1 || num > currentPresentation.slides.length) {
                  result = JSON.stringify({ error: `Invalid slide_number. There are ${currentPresentation.slides.length} slides.` });
                } else {
                  const removed = currentPresentation.slides.splice(num - 1, 1)[0];

                  await stream.writeSSE({
                    event: "presentation_update",
                    data: JSON.stringify({
                      mode: "slides", title: currentPresentationTitle,
                      themeCss: currentPresentation.themeCss, slides: currentPresentation.slides,
                    }),
                  });
                  result = JSON.stringify({ success: true, message: `Removed slide ${num} ("${removed?.title ?? ""}"). Total slides: ${currentPresentation.slides.length}.` });
                }
              }
            } else {
              result = JSON.stringify({ error: `Unknown edit action: ${input.action}. Use 'edit_lines', 'add_slide', or 'remove_slide'.` });
            }
            } // end else (active presentation)
          } else if (toolUse.name === "write_presentation") {
            const input = toolUse.input as { presentation_id?: string; title?: string; mode: string; html?: string; theme_css?: string; slides?: SlideData[] };
            currentPresentationTitle = input.title || "";
            // Determine which presentation ID to send to frontend
            const writePresentationId = input.presentation_id || activePresentationId || undefined;
            if (input.mode === "slides") {
              currentPresentation.mode = "slides";
              currentPresentation.html = "";
              currentPresentation.themeCss = input.theme_css || "";
              currentPresentation.slides = input.slides || [];
              await stream.writeSSE({
                event: "presentation_update",
                data: JSON.stringify({
                  mode: "slides", title: currentPresentationTitle,
                  themeCss: currentPresentation.themeCss, slides: currentPresentation.slides,
                  presentationId: writePresentationId,
                }),
              });
            } else {
              currentPresentation.mode = "document";
              currentPresentation.html = input.html || "";
              currentPresentation.themeCss = "";
              currentPresentation.slides = [];
              await stream.writeSSE({
                event: "presentation_update",
                data: JSON.stringify({
                  mode: "document", title: currentPresentationTitle,
                  html: currentPresentation.html,
                  presentationId: writePresentationId,
                }),
              });
            }
            result = JSON.stringify({
              success: true,
              message: "Presentation updated. The content is now visible in the Presentation tab.",
            });
          } else {
            result = JSON.stringify({ error: `Unknown tool: ${toolUse.name}` });
          }

          // Send tool result to the client
          await stream.writeSSE({
            event: "tool_result",
            data: JSON.stringify({
              name: toolUse.name,
              args: toolUse.input,
              result: JSON.parse(result),
            }),
          });

          toolResults.push({
            type: "tool_result" as const,
            tool_use_id: toolUse.id,
            content: result,
          });
        }

        conversationMessages.push({
          role: "user",
          content: toolResults,
        });

        // Loop back for the next round — Claude will respond with the tool results
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      logger.error(`Chat stream error: ${message}`);
      await stream.writeSSE({
        event: "error",
        data: message,
      });
    }
  });
});

export default chat;
