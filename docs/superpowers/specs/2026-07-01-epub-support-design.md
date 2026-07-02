# EPUB Support Design

**Date:** 2026-07-01
**Status:** Approved

## Overview

Add EPUB format support to novel-cli, allowing users to open and read `.epub` e-books alongside existing `.txt` and `.md` files.

## Architecture

### Strategy Pattern for File Parsing

Introduce a `parser.ts` module as the unified entry point. It dispatches to format-specific parsers based on file extension, while `useFile` only handles caching/memoization.

```
src/utils/
  parser.ts          ← NEW: dispatch by extension, unified return type
  epub-parser.ts     ← NEW: EPUB-specific parsing (unzip, XML, TOC, content extraction)
  encoding.ts        ← unchanged: existing text file reading (used by parser for .txt/.md)
```

### Data Flow

```
Reader → useFile(path) → parseFile(path, encoding)
                            ├─ .txt/.md → parseTextFile()  (existing logic in encoding.ts)
                            └─ .epub    → parseEpubFile()
                                            ├─ Unzip EPUB via "epub" npm package
                                            ├─ Extract metadata + TOC (hybrid: epub-toc first → regex fallback)
                                            ├─ Concatenate XHTML per spine order → strip HTML tags → lines[]
                                            └─ Return unified FileResult { lines, fileName, filePath, chapters, encoding }
```

### Unified Return Type

`FileResult` gains an optional `chapters` field, populated by whichever parser ran. Reader no longer calls `parseChapters()` internally — chapters come pre-parsed from the file hook.

### Hybrid Chapter Strategy

1. EPUB has `toc.ncx` or `nav.xhtml` → use it directly, preserving nested hierarchy with indentation
2. No TOC in EPUB → fall back to existing `parseChapters()` regex matching on the extracted text
3. Plain text files → same regex matching as today, results lifted into the unified `chapters` field

### HTML Content Handling

- `<p>`, `<br>`, `<div>` → line breaks
- `<h1>`–`<h6>` → standalone lines (no special terminal markup)
- All other HTML tags → stripped
- Whitespace normalized (consecutive blank lines collapsed to one)

### TOC Display

`TocPanel` updated to support nested chapters with indentation. Flat chapters (txt, regex-fallback epub) render with no indent; nested epub TOC entries render with 2-space indentation per level.

## Files Changed

| File | Change | Description |
|------|--------|-------------|
| `src/utils/epub-parser.ts` | **NEW** | EPUB parsing: unzip, extract metadata/TOC, strip HTML, return unified result |
| `src/utils/parser.ts` | **NEW** | Format dispatcher (`parseFile`), re-exports `parseTextFile` for txt/md |
| `src/hooks/use-file.ts` | **MODIFIED** | Delegate to `parseFile()` instead of direct `readFileLines()` |
| `src/components/file-browser.tsx` | **MODIFIED** | Add `.epub` to file filter (`.txt`, `.md`, `.epub`) |
| `src/types.ts` | **MODIFIED** | `FileResult` gains `chapters?: Chapter[]`; `Chapter` gains `depth?: number` (0-based, flat list with depth markers for nested TOC rendering) |
| `src/components/reader.tsx` | **MODIFIED** | Use `fileResult.chapters` directly instead of calling `parseChapters()` |
| `src/components/toc-panel.tsx` | **MODIFIED** | Render nested TOC with indentation per depth level |

## Dependencies

- **New:** `epub` npm package — lightweight EPUB parser with zero transitive dependencies, ~500 lines
- **No other new dependencies**

## Error Handling

- Corrupt or unreadable EPUB → `useFile` returns `null`, same error state as today for unreadable txt files
- Missing TOC in EPUB → silent fallback to regex chapter detection
- Invalid HTML in XHTML files → best-effort stripping, malformed tags treated as plain text

## Non-Goals

- PDF, MOBI, or other e-book formats
- Rich text rendering (bold, italic, images)
- EPUB writing/editing
- DRM-protected EPUB files
