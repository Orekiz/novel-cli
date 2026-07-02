# EPUB Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add EPUB format support to novel-cli, allowing users to open and read `.epub` e-books with nested TOC navigation.

**Architecture:** Introduce a strategy-pattern parser layer (`parser.ts` dispatches by extension, `epub-parser.ts` handles EPUB). `useFile` switches from sync `useMemo` to async `useState+useEffect` to support EPUB's async parsing. Chapters are pre-computed by parsers and flow through `FileResult`, removing `parseChapters()` calls from `reader.tsx`. TOC panel gains indentation for nested EPUB chapters.

**Tech Stack:** TypeScript, React 18, Ink 5, `epub` npm package (v2.1.1)

---

### Task 1: Install epub dependency and update esbuild externals

**Files:**
- Modify: `package.json`
- Modify: `esbuild.config.mjs`

- [ ] **Step 1: Install epub package**

```bash
npm install epub@2.1.1
```

Expected: package added to `package.json` dependencies and `node_modules/epub/`.

- [ ] **Step 2: Add epub and its transitive deps to esbuild externals**

Read `esbuild.config.mjs`. The `external` array currently contains `commander`, `iconv-lite`, `ink`, `react`. Add `epub` and its dependencies (`jszip`, `fast-xml-parser`):

```javascript
const external = [
  ...nodeBuiltins,
  'commander', 'iconv-lite', 'ink', 'react',
  'epub', 'jszip', 'fast-xml-parser',
];
```

- [ ] **Step 3: Verify build still works**

```bash
npm run build
```

Expected: `Build complete: dist/cli.js` with no errors. Run `node dist/cli.js --help` to confirm CLI still works.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json esbuild.config.mjs
git commit -m "chore: add epub dependency and esbuild externals"
```

---

### Task 2: Update types for chapters and FileResult

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Add `depth` field to `Chapter` interface**

Read `src/types.ts`. In the `Chapter` interface (line 14), add the optional `depth` field:

```typescript
export interface Chapter {
  index: number;
  title: string;
  startLine: number;
  endLine: number;
  depth?: number;  // 0-based nesting depth for TOC rendering (0 = top level)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat(types): add depth field to Chapter for nested TOC support"
```

---

### Task 3: Create epub-parser.ts

**Files:**
- Create: `src/utils/epub-parser.ts`

- [ ] **Step 1: Write the epub-parser module**

Create `src/utils/epub-parser.ts`:

```typescript
import EPub from 'epub';
import path from 'node:path';
import { Chapter } from '../types.js';
import { parseChapters } from './chapter-parser.js';

/**
 * Strip HTML tags from an HTML string, converting block elements to line breaks.
 * Returns an array of text lines ready for the reader.
 */
function stripHtml(html: string): string[] {
  // 1. Replace structural block elements with newlines
  let text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/table>/gi, '\n')
    .replace(/<\/blockquote>/gi, '\n')
    .replace(/<\/section>/gi, '\n')
    .replace(/<\/article>/gi, '\n')
    .replace(/<hr\s*\/?>/gi, '\n');

  // 2. Strip all remaining HTML tags
  text = text.replace(/<[^>]*>/g, '');

  // 3. Decode common HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&nbsp;/g, ' ');

  // 4. Split into lines, trim, collapse consecutive blank lines
  const rawLines = text.split(/\n/).map(line => line.trim());
  const result: string[] = [];
  let prevBlank = false;
  for (const line of rawLines) {
    if (line === '') {
      if (!prevBlank) result.push('');
      prevBlank = true;
    } else {
      result.push(line);
      prevBlank = false;
    }
  }
  return result;
}

export interface EpubResult {
  lines: string[];
  fileName: string;
  filePath: string;
  chapters: Chapter[];
}

/**
 * Parse an EPUB file: extract text content in spine order, build chapter list from TOC
 * (with fallback to regex-based chapter detection).
 */
export async function parseEpubFile(filePath: string): Promise<EpubResult> {
  const epub = new EPub(filePath);
  await epub.parse();

  const fileName = path.basename(filePath, path.extname(filePath));

  // Build a lookup from manifest href (normalized) to manifest id
  const hrefToId = new Map<string, string>();
  for (const [id, item] of Object.entries(epub.manifest)) {
    hrefToId.set(item.href, id);
  }

  // Concatenate all spine items in order, tracking line ranges
  const allLines: string[] = [];
  const spineRanges: { id: string; startLine: number; endLine: number }[] = [];

  for (const item of epub.flow) {
    const startLine = allLines.length;
    try {
      const html = await epub.getChapter(item.id);
      const lines = stripHtml(html);
      allLines.push(...lines);
    } catch {
      // Skip inaccessible chapters (e.g. SVG-only items)
    }
    spineRanges.push({ id: item.id, startLine, endLine: allLines.length });
  }

  // Build chapters: use EPUB TOC if available, otherwise fall back to regex
  let chapters: Chapter[];

  if (epub.toc.length > 0) {
    // Build flat chapter list from TOC entries, preserving depth for indentation.
    // Each TOC entry is mapped to a spine range by matching href → id.
    chapters = epub.toc.map((tocEntry, i) => {
      const id = tocEntry.id || hrefToId.get(tocEntry.href) || '';
      const range = spineRanges.find(r => r.id === id);

      return {
        index: i,
        title: tocEntry.title || `Chapter ${i + 1}`,
        startLine: range?.startLine ?? 0,
        endLine: range?.endLine ?? 0,
        depth: tocEntry.level ?? 0,
      } satisfies Chapter;
    });

    // Filter out TOC entries that map to empty spine ranges (no content)
    chapters = chapters.filter(ch => ch.endLine > ch.startLine || ch.startLine < allLines.length);

    // Re-index after filtering
    chapters = chapters.map((ch, i) => ({ ...ch, index: i }));
  } else {
    // No TOC: use regex-based chapter detection on the full text
    chapters = parseChapters(allLines);
  }

  return { lines: allLines, fileName, filePath, chapters };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/utils/epub-parser.ts
git commit -m "feat: add epub-parser with TOC extraction and HTML stripping"
```

---

### Task 4: Create parser.ts (format dispatcher)

**Files:**
- Create: `src/utils/parser.ts`

- [ ] **Step 1: Write the parser dispatcher**

Create `src/utils/parser.ts`:

```typescript
import path from 'node:path';
import { Encoding, readFileLines } from './encoding.js';
import { parseEpubFile, EpubResult } from './epub-parser.js';
import { parseChapters } from './chapter-parser.js';
import { Chapter } from '../types.js';

export interface ParseResult {
  lines: string[];
  fileName: string;
  filePath: string;
  chapters: Chapter[];
}

/**
 * Sync parse for plain text files (.txt, .md).
 */
function parseTextFile(filePath: string, encoding?: Encoding): ParseResult {
  const lines = readFileLines(filePath, encoding);
  const chapters = parseChapters(lines);
  return {
    lines,
    fileName: path.basename(filePath, path.extname(filePath)),
    filePath,
    chapters,
  };
}

/**
 * Returns true if the file extension indicates an EPUB file.
 */
export function isEpubFile(filePath: string): boolean {
  return path.extname(filePath).toLowerCase() === '.epub';
}

/**
 * Parse text files synchronously. For EPUB files, returns null (use parseFileAsync instead).
 */
export function parseFileSync(filePath: string, encoding?: Encoding): ParseResult | null {
  if (isEpubFile(filePath)) {
    return null; // EPUB requires async parsing
  }
  return parseTextFile(filePath, encoding);
}

/**
 * Parse EPUB files asynchronously. For non-EPUB files, returns null.
 */
export async function parseFileAsync(filePath: string): Promise<ParseResult | null> {
  if (!isEpubFile(filePath)) {
    return null;
  }
  try {
    return await parseEpubFile(filePath);
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/utils/parser.ts
git commit -m "feat: add parser dispatcher for txt/epub format routing"
```

---

### Task 5: Modify use-file.ts to use parser layer

**Files:**
- Modify: `src/hooks/use-file.ts`

- [ ] **Step 1: Rewrite use-file.ts to handle both sync text and async EPUB**

Replace the current `useFile` implementation. The current hook uses `useMemo` (sync only). The new version uses `useState` + `useEffect` to support async EPUB parsing while keeping text files synchronous:

Read current `src/hooks/use-file.ts` and replace its contents with:

```typescript
import { useState, useEffect } from 'react';
import path from 'node:path';
import { Encoding } from '../utils/encoding.js';
import { parseFileSync, parseFileAsync, isEpubFile } from '../utils/parser.js';
import { Chapter } from '../types.js';

export interface FileResult {
  lines: string[];
  fileName: string;
  filePath: string;
  chapters: Chapter[];
}

export function useFile(filePath: string | null, encoding?: Encoding): FileResult | null {
  const [result, setResult] = useState<FileResult | null>(() => {
    // Sync init: handle text files immediately, return null for EPUB (will load in effect)
    if (!filePath) return null;
    try {
      return parseFileSync(filePath, encoding);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!filePath) {
      setResult(null);
      return;
    }

    if (isEpubFile(filePath)) {
      // Async load for EPUB
      let cancelled = false;
      parseFileAsync(filePath).then(epubResult => {
        if (!cancelled && epubResult) {
          setResult(epubResult);
        }
      });
      return () => { cancelled = true; };
    } else {
      // Sync load for text files (handles encoding changes)
      try {
        setResult(parseFileSync(filePath, encoding));
      } catch {
        setResult(null);
      }
    }
  }, [filePath, encoding]);

  return result;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no type errors. The `Chapter` import from `../types.js` must match the updated interface (with `depth`).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-file.ts
git commit -m "refactor(use-file): switch to parser layer, support async EPUB loading"
```

---

### Task 6: Update file-browser.tsx to show .epub files

**Files:**
- Modify: `src/components/file-browser.tsx`

- [ ] **Step 1: Add `.epub` to the file filter**

Read `src/components/file-browser.tsx`. On line 37, the filter is:

```typescript
} else if (item.name.endsWith('.txt') || item.name.endsWith('.md')) {
```

Change it to also include `.epub`:

```typescript
} else if (item.name.endsWith('.txt') || item.name.endsWith('.md') || item.name.endsWith('.epub')) {
```

- [ ] **Step 2: Commit**

```bash
git add src/components/file-browser.tsx
git commit -m "feat(file-browser): add .epub to supported file extensions"
```

---

### Task 7: Update reader.tsx to use fileResult.chapters

**Files:**
- Modify: `src/components/reader.tsx`

Currently `reader.tsx` calls `parseChapters(lines)` locally (line 59). Now chapters come from `fileResult.chapters`. Make the following changes:

- [ ] **Step 1: Remove the local parseChapters call and use fileResult.chapters**

Read `src/components/reader.tsx`. Change lines 52-59:

**Before (line 52-59):**
```typescript
  const lines = fileResult?.lines ?? [];
  const contentWidth = termWidth - paddingWidth - (showLineNumbers ? lineNumWidth : 0);
  const visualLineCounts = useMemo(
    () => getVisualLineCount(lines, contentWidth),
    [lines, contentWidth]
  );
  const totalVisualLines = visualLineCounts.reduce((a, b) => a + b, 0);
  const chapters = useMemo(() => fileResult ? parseChapters(lines) : [], [lines, fileResult]);
```

**After:**
```typescript
  const lines = fileResult?.lines ?? [];
  const contentWidth = termWidth - paddingWidth - (showLineNumbers ? lineNumWidth : 0);
  const visualLineCounts = useMemo(
    () => getVisualLineCount(lines, contentWidth),
    [lines, contentWidth]
  );
  const totalVisualLines = visualLineCounts.reduce((a, b) => a + b, 0);
  const chapters = fileResult?.chapters ?? [];
```

- [ ] **Step 2: Remove the unused `parseChapters` import**

Line 15 currently imports `parseChapters`:

```typescript
import { parseChapters } from '../utils/chapter-parser.js';
```

Remove this line entirely.

- [ ] **Step 3: Update the fileLoaded effect to handle pre-parsed chapters**

The effect at line 69 uses `chapters.length` to compute initial chapter index. Since `chapters` now comes from `fileResult`, and `fileLoaded` tracks first load, the logic still works correctly — the effect re-runs when `chapters` changes (it's in the dependency array via `fileResult`).

However, `fileLoaded` is set to `true` inside the effect, and `chapters` depends on `fileResult` which is set before the effect runs. Verify the dependency array at line 87 already includes `chapters`:

```typescript
  }, [fileResult, fileLoaded, visualLineCounts, viewerHeight, chapters]);
```

It does include `chapters`. No change needed.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/reader.tsx
git commit -m "refactor(reader): use pre-parsed chapters from FileResult"
```

---

### Task 8: Update toc-panel.tsx for nested TOC indentation

**Files:**
- Modify: `src/components/toc-panel.tsx`

- [ ] **Step 1: Add indentation to TOC entries based on `depth`**

Read `src/components/toc-panel.tsx`. The visible chapter rendering is at lines 135-152. Modify the title rendering to add indentation based on `ch.depth`:

**Before (lines 141-150):**
```tsx
          return (
            <Box key={ch.index}>
              <Text color={isSelected ? indicatorColor : undefined}>
                {prefix}
              </Text>
              <Text bold={isCurrent} color={isSelected ? indicatorColor : undefined}>
                {ch.title}
              </Text>
              <Text dimColor>{suffix}</Text>
            </Box>
          );
```

**After:**
```tsx
          const indent = '  '.repeat(ch.depth ?? 0);
          return (
            <Box key={ch.index}>
              <Text color={isSelected ? indicatorColor : undefined}>
                {prefix}
              </Text>
              <Text dimColor>{indent}</Text>
              <Text bold={isCurrent} color={isSelected ? indicatorColor : undefined}>
                {ch.title}
              </Text>
              <Text dimColor>{suffix}</Text>
            </Box>
          );
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/toc-panel.tsx
git commit -m "feat(toc-panel): render nested TOC entries with indentation"
```

---

### Task 9: End-to-end smoke test

- [ ] **Step 1: Build the project**

```bash
npm run build
```

Expected: `Build complete: dist/cli.js`

- [ ] **Step 2: Test with a txt file (regression check)**

```bash
node dist/cli.js test-book.txt
```

Verify: the reader opens, navigation works (j/k, [/], t for TOC, etc.), status bar shows progress. Press `Esc` or `:q` to exit.

- [ ] **Step 3: Test with an EPUB file**

If you have an EPUB file available:
```bash
node dist/cli.js ~/path/to/book.epub
```

Verify:
- The book loads and displays text
- `[`/`]` navigates between chapters
- `t` opens TOC panel showing chapter titles (with indentation for nested entries)
- `/` search works across the extracted text
- Status bar shows chapter title and progress

- [ ] **Step 4: Test file browser shows .epub files**

```bash
node dist/cli.js --browse
```

Verify: `.epub` files appear in the file browser alongside `.txt` and `.md` files. Selecting an EPUB opens it in the reader.

- [ ] **Step 5: Commit any fixes from smoke testing**

```bash
git add -A
git commit -m "chore: fixes from EPUB smoke testing"
```
