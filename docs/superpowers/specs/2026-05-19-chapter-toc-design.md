# Chapter & TOC System Design

## Overview

Add chapter-based reading and a table-of-contents overlay to the terminal novel reader. Chapters are auto-detected from the text file using common Chinese novel patterns. The reader constrains display to one chapter at a time, with navigation between chapters and a searchable TOC overlay.

## Chapter Detection

### Patterns (in priority order)

1. `^第[一二三四五六七八九十百零〇\d]+[章节回卷]` — matches `第一章`, `第2节`, `第100回`, `第3卷`
2. `^\d+[.、．\s]+` — matches `001 引子`, `1.标题`, `02 开始`

### Chapter boundaries

- Content before the first matched heading → automatically named "前言" (prologue)
- Content from a heading to the next heading → that chapter's content
- Content after the last matched heading → automatically named "后记" (epilogue)
- If no chapters are detected at all, the entire file becomes a single chapter "全文"

### Chapter type

```typescript
interface Chapter {
  index: number;
  title: string;        // the raw matched heading line, e.g. "第一章 穿越"
  startLine: number;    // 0-based inclusive line index
  endLine: number;      // 0-based exclusive line index
}
```

### Parser location

`src/utils/chapter-parser.ts` — pure function, no React or IO:
- `parseChapters(lines: string[]): Chapter[]`

## Reader Changes

### New state

- `chapters: Chapter[]` — computed from `useMemo` when lines change
- `currentChapterIdx: number` — current chapter index, initialized to 0 (always starts from the beginning of the file)

### Chapter-constrained scrolling

- `scrollOffset` is relative to the current chapter's start
- `maxOffset` = chapter's visual line count minus viewerHeight (clamped to 0 minimum)
- When switching chapters, `scrollOffset` resets to 0 (top of new chapter)
- The visible line computation filters to only lines within `[chapters[currentChapterIdx].startLine, chapters[currentChapterIdx].endLine)`

### New shortcuts (normal mode)

| Key | Action |
|---|---|
| `t` | Open TOC overlay (`setReadingMode('toc')`) |
| `[` | Previous chapter (clamped to 0) |
| `]` | Next chapter (clamped to chapters.length - 1) |

### Mode addition

- `ReadingMode` gains `'toc'`
- In toc mode, all input is forwarded to the `<TocPanel>` component
- The toc overlay occupies the viewer area (similar to HelpPanel)

## TocPanel Component

### Location

`src/components/toc-panel.tsx`

### Props

```typescript
interface TocPanelProps {
  chapters: Chapter[];
  currentChapterIdx: number;
  onSelect: (chapterIdx: number) => void;
  onClose: () => void;
}
```

### Layout

An overlay panel rendered inside the reader's viewer area:

```
┌─ Novel Reader ─────────────────────┐
│ ┌──────── TOC ──────────────────┐  │
│ │  Search: [                    ] │  │
│ │                                │  │
│ │  ▸ 前言                        │  │
│ │    第一章 穿越异世界            │  │
│ │    第二章 初到京城              │  │
│ │    第三章 风云再起              │  │
│ │    ...                         │  │
│ │    后记                        │  │
│ │                                │  │
│ │  j/k navigate · / search       │  │
│ └────────────────────────────────┘  │
│ ─────────────────────────────────── │
│ NORMAL novel.txt [████░░░] 45% ... │
└────────────────────────────────────┘
```

### Keyboard handling

- `j` / `↓` — move selection down
- `k` / `↑` — move selection up
- `/` — enter search mode within TOC
- Escape from search — exit search mode back to TOC navigation
- Enter — select chapter and close TOC
- Escape (in navigation mode) — close TOC
- When in search mode (the panel shows a text input):
  - Typing filters the chapter list by title
  - Backspace deletes characters
  - Escape cancels search, returns to navigation mode
  - Enter selects the first (or highlighted) filtered result

### Search behavior

- Filters chapters where the title includes the query (case-insensitive)
- Matches both chapter number (`第一章`, `第2章`) and title text
- Filtered list updates in real-time as the user types
- If no matches, shows "No matching chapters"

## Status Bar Changes

Add chapter indicator: `第3章/共20章` or `前言` for prologue.

Format: `[章 3/20]` appended before the progress info.

## Command Changes

Add to `commands.ts`:
- `:toc` — opens the TOC overlay (same as `t` key)

## Help Panel Updates

Add new entries:
- `t` — Open table of contents
- `[` / `]` — Previous / Next chapter

## File Changes Summary

| File | Change |
|---|---|
| `src/utils/chapter-parser.ts` | **New** — chapter detection pure function |
| `src/types.ts` | Add `'toc'` to ReadingMode, add `Chapter` interface |
| `src/components/toc-panel.tsx` | **New** — TOC overlay component |
| `src/components/reader.tsx` | Chapter state, constrained scrolling, `[`/`]`/`t` keys, toc mode routing |
| `src/components/status-bar.tsx` | Add chapter indicator |
| `src/components/help-panel.tsx` | Add TOC/chapter shortcuts |
| `src/utils/commands.ts` | Add `:toc` command |

## Implementation Order

1. Create `src/utils/chapter-parser.ts`
2. Update `src/types.ts` (add Chapter, 'toc' mode)
3. Create `src/components/toc-panel.tsx`
4. Update `src/components/reader.tsx` (chapters, constrained scroll, keys, toc mode)
5. Update `src/components/status-bar.tsx`
6. Update `src/components/help-panel.tsx`
7. Update `src/utils/commands.ts`
8. Build and test
