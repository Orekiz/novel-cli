# Chapter & TOC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add chapter detection, chapter-constrained reading, and a searchable table-of-contents overlay.

**Architecture:** A pure-function chapter parser (`src/utils/chapter-parser.ts`) scans text lines for Chinese novel chapter patterns. The Reader component uses the parsed chapter list to constrain scrolling to one chapter at a time. A new `'toc'` ReadingMode renders a TocPanel overlay with j/k navigation and inline search.

**Tech Stack:** TypeScript, React 18, Ink 5 (terminal UI), esbuild bundler

---

### Task 1: Add Chapter interface and 'toc' ReadingMode to types.ts

**Files:**
- Modify: `src/types.ts` — add `Chapter` interface, add `'toc'` to `ReadingMode`

- [ ] **Step 1: Add Chapter interface and update ReadingMode**

Insert the `Chapter` interface after the existing `Theme` interface. Add `'toc'` to the `ReadingMode` union. Also add `toc` and `chapterNav` entries to `KeyBindings`.

Edit `src/types.ts`:

```typescript
// After the Theme interface, add:
export interface Chapter {
  index: number;
  title: string;
  startLine: number;    // 0-based inclusive
  endLine: number;      // 0-based exclusive
}
```

Change `ReadingMode` from:
```typescript
export type ReadingMode = 'normal' | 'command' | 'search' | 'help';
```
to:
```typescript
export type ReadingMode = 'normal' | 'command' | 'search' | 'help' | 'toc';
```

Add to `KeyBindings`:
```typescript
export interface KeyBindings {
  // ... existing fields ...
  openToc: string[];
  prevChapter: string[];
  nextChapter: string[];
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit --strict src/types.ts`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add Chapter type and toc reading mode"
```

---

### Task 2: Create chapter parser utility

**Files:**
- Create: `src/utils/chapter-parser.ts`

- [ ] **Step 1: Write the chapter parser**

Import `Chapter` from types and create file.

Create `src/utils/chapter-parser.ts` with the pure parsing function:

```typescript
import { Chapter } from '../types.js';

// Pattern 1: 第X章/节/回/卷
const CHAPTER_PATTERN = /^第[一二三四五六七八九十百零〇\d]+[章节回卷]/;

// Pattern 2: Numbered title (e.g. "001 引子", "1.标题", "02 开始")
const NUMBERED_TITLE_PATTERN = /^\d+[.、．\s]+/;

export function isChapterHeading(line: string): boolean {
  return CHAPTER_PATTERN.test(line) || NUMBERED_TITLE_PATTERN.test(line);
}

export function parseChapters(lines: string[]): Chapter[] {
  const chapters: Chapter[] = [];
  let chapterStart = 0;
  let chapterTitle = '';

  // Detect first heading
  let firstHeadingIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (isChapterHeading(lines[i])) {
      firstHeadingIdx = i;
      break;
    }
  }

  if (firstHeadingIdx === -1) {
    // No chapters detected — single "full text" chapter
    return [{ index: 0, title: '全文', startLine: 0, endLine: lines.length }];
  }

  // Prologue: content before first heading
  const hasPrologue = firstHeadingIdx > 0;
  if (hasPrologue) {
    chapters.push({ index: 0, title: '前言', startLine: 0, endLine: firstHeadingIdx });
  }

  // Scan for chapter headings
  chapterStart = firstHeadingIdx;
  chapterTitle = lines[firstHeadingIdx];

  for (let i = firstHeadingIdx + 1; i < lines.length; i++) {
    if (isChapterHeading(lines[i])) {
      chapters.push({
        index: hasPrologue ? chapters.length : chapters.length,
        title: chapterTitle,
        startLine: chapterStart,
        endLine: i,
      });
      chapterStart = i;
      chapterTitle = lines[i];
    }
  }

  // Last chapter
  chapters.push({
    index: chapters.length,
    title: chapterTitle,
    startLine: chapterStart,
    endLine: lines.length,
  });

  // Epilogue: content after last chapter heading (if any extra lines exist)
  // Actually, the last chapter's endLine already includes epilogue content.
  // We don't create a separate epilogue entry because the user said
  // non-chapter content goes into the preceding chapter.
  // However, if the last lines after the final heading look like epilogue text,
  // they're already included in the last chapter's range.

  return chapters;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --strict src/utils/chapter-parser.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/utils/chapter-parser.ts
git commit -m "feat: add chapter parser utility"
```

---

### Task 3: Create TocPanel component

**Files:**
- Create: `src/components/toc-panel.tsx`

- [ ] **Step 1: Write the TocPanel component**

Create `src/components/toc-panel.tsx`:

```typescript
import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { Chapter } from '../utils/chapter-parser.js';
import { useTheme } from '../hooks/use-theme.js';

interface TocPanelProps {
  chapters: Chapter[];
  currentChapterIdx: number;
  onSelect: (chapterIdx: number) => void;
  onClose: () => void;
}

export default function TocPanel({ chapters, currentChapterIdx, onSelect, onClose }: TocPanelProps) {
  const { theme } = useTheme();
  const [mode, setMode] = useState<'browse' | 'search'>('browse');
  const [selectedIdx, setSelectedIdx] = useState(currentChapterIdx);
  const [searchInput, setSearchInput] = useState('');

  const filteredChapters = useMemo(() => {
    if (!searchInput.trim()) return chapters;
    const q = searchInput.toLowerCase();
    return chapters.filter(ch => ch.title.toLowerCase().includes(q));
  }, [chapters, searchInput]);

  const displayList = filteredChapters.length > 0 ? filteredChapters : chapters;

  useInput((input, key) => {
    if (mode === 'search') {
      if (key.escape) {
        setMode('browse');
        setSearchInput('');
        return;
      }
      if (key.return) {
        if (filteredChapters.length > 0) {
          // Use the currently selected item in filtered list, or default to first match
          const targetIdx = filteredChapters[Math.min(selectedIdx, filteredChapters.length - 1)].index;
          onSelect(targetIdx);
        }
        return;
      }
      if (key.backspace || key.delete) {
        setSearchInput(prev => prev.slice(0, -1));
        return;
      }
      if (input && !key.ctrl && !key.meta) {
        setSearchInput(prev => prev + input);
        setSelectedIdx(0);
      }
      return;
    }

    // Browse mode
    if (key.escape) { onClose(); return; }
    if (key.upArrow || input === 'k') {
      setSelectedIdx(prev => Math.max(0, prev - 1));
      return;
    }
    if (key.downArrow || input === 'j') {
      setSelectedIdx(prev => Math.min(displayList.length - 1, prev + 1));
      return;
    }
    if (key.return) {
      onSelect(displayList[selectedIdx].index);
      return;
    }
    if (input === '/') {
      setMode('search');
      setSearchInput('');
      return;
    }
  });

  const indicatorColor = theme.highlight || 'cyan';

  return (
    <Box flexDirection="column" padding={1} borderStyle="round">
      <Box marginBottom={1}>
        <Text bold inverse> Table of Contents </Text>
      </Box>

      {mode === 'search' && (
        <Box marginBottom={1}>
          <Text bold color="cyan">/</Text>
          <Text>{searchInput || 'Search chapters...'}</Text>
          <Text dimColor>  (Esc to cancel)</Text>
        </Box>
      )}

      <Box flexDirection="column" marginBottom={1}>
        {displayList.map((ch, idx) => {
          const isCurrent = ch.index === currentChapterIdx;
          const isSelected = idx === selectedIdx;
          const prefix = isSelected ? '▸ ' : '  ';
          const suffix = isCurrent ? '  ←' : '';
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
        })}
        {filteredChapters.length === 0 && searchInput.trim() && (
          <Text dimColor>  No matching chapters</Text>
        )}
      </Box>

      <Text dimColor>
        {mode === 'browse' ? 'j/k navigate · / search · Enter select · Esc close' : 'Type to search · Enter confirm · Esc cancel'}
      </Text>
    </Box>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/toc-panel.tsx
git commit -m "feat: add TocPanel component"
```

---

### Task 4: Update Reader component with chapter support

**Files:**
- Modify: `src/components/reader.tsx` — chapter parsing, constrained scrolling, new shortcuts, toc mode routing

- [ ] **Step 1: Add imports, new state, and chapter parsing**

Import the chapter parser and TocPanel at the top of `reader.tsx`:
```typescript
import { parseChapters, Chapter } from '../utils/chapter-parser.js';
import TocPanel from './toc-panel.js';
```

After the existing state declarations (after `const [fileLoaded, setFileLoaded] = useState(false);`), add:
```typescript
const chapters = useMemo(() => fileResult ? parseChapters(lines) : [], [lines, fileResult]);
const [currentChapterIdx, setCurrentChapterIdx] = useState(0);
```

- [ ] **Step 2: Update scroll constraints for chapter-based reading**

Replace the existing `maxOffset` calculation with a chapter-aware version.

After the `const totalVisualLines` line, add the chapter range computation:
```typescript
const currentChapter = chapters[currentChapterIdx] || chapters[0];
const chapterStartLine = currentChapter?.startLine ?? 0;
const chapterEndLine = currentChapter?.endLine ?? lines.length;
const chapterVisualStart = visualLineCounts.slice(0, chapterStartLine).reduce((a, b) => a + b, 0);
const chapterVisualCount = visualLineCounts.slice(chapterStartLine, chapterEndLine).reduce((a, b) => a + b, 0);
const maxOffset = Math.max(0, chapterVisualCount - viewerHeight);
```

Also update the `visibleLines` useMemo: instead of iterating all lines, iterate only `lines.slice(chapterStartLine, chapterEndLine)` and adjust scroll offset reference.

Replace the existing `visibleLines` computation:

```typescript
const visibleLines = useMemo(() => {
  const result: { text: string; logicalLine: number; isHighlighted: boolean }[] = [];
  let visualRow = 0;
  for (let i = chapterStartLine; i < chapterEndLine && i < lines.length; i++) {
    const wrapped = wrapLine(lines[i], contentWidth);
    for (let w = 0; w < wrapped.length; w++) {
      if (visualRow >= scrollOffset && visualRow < scrollOffset + viewerHeight) {
        result.push({
          text: wrapped[w],
          logicalLine: i + 1,
          isHighlighted: searchMatches.includes(i),
        });
      }
      visualRow++;
      if (visualRow > scrollOffset + viewerHeight) break;
    }
    if (visualRow > scrollOffset + viewerHeight) break;
  }
  return result;
}, [lines, chapterStartLine, chapterEndLine, scrollOffset, viewerHeight, contentWidth, searchMatches]);
```

- [ ] **Step 3: Update the useEffect that loads last position**

Modify the existing `useEffect` that loads last position to also set `currentChapterIdx`:

```typescript
useEffect(() => {
  if (fileResult && !fileLoaded) {
    const lastPos = getLastPosition(fileResult.filePath);
    // Find which chapter contains lastPos, default to 0
    let chapterIdx = 0;
    for (let i = 0; i < chapters.length; i++) {
      if (lastPos >= chapters[i].startLine && lastPos < chapters[i].endLine) {
        chapterIdx = i;
        break;
      }
    }
    setCurrentChapterIdx(chapterIdx);
    const chapter = chapters[chapterIdx];
    const startVisual = chapter ? visualLineCounts.slice(0, chapter.startLine).reduce((a, b) => a + b, 0) : 0;
    const chapterVisualCount = chapter ? visualLineCounts.slice(chapter.startLine, chapter.endLine).reduce((a, b) => a + b, 0) : 0;
    const posWithinChapter = visualLineCounts.slice(0, lastPos).reduce((a, b) => a + b, 0) - startVisual;
    setScrollOffset(Math.max(0, Math.min(posWithinChapter - Math.floor(viewerHeight / 3), chapterVisualCount - viewerHeight)));
    setFileLoaded(true);

    const bookmarks = getBookmarks();
    if (bookmarks[fileResult.filePath] !== undefined) {
      setBookmarkLine(bookmarks[fileResult.filePath]);
    }
  }
}, [fileResult, fileLoaded, visualLineCounts, viewerHeight, chapters]);
```

- [ ] **Step 4: Update the scroll position save useEffect**

In the `useEffect` that saves scroll position, adjust the logical line computation to account for chapter offset:

```typescript
useEffect(() => {
  if (!fileResult) return;
  let logicalLine = chapterStartLine;
  let accumulated = 0;
  for (let i = chapterStartLine; i < chapterEndLine && i < visualLineCounts.length; i++) {
    if (accumulated + visualLineCounts[i] > scrollOffset) break;
    accumulated += visualLineCounts[i];
    logicalLine = i + 1;
  }
  updateHistory(fileResult.filePath, logicalLine);
}, [scrollOffset, fileResult, visualLineCounts, chapterStartLine, chapterEndLine]);
```

- [ ] **Step 5: Add chapter navigation keys to the normal mode handler**

Inside the normal mode section of `useInput`, add after the existing key handlers (before `// Search next`):

```typescript
    // TOC
    if (input === 't') { setReadingMode('toc'); return; }
    // Previous chapter
    if (input === '[') {
      setCurrentChapterIdx(prev => {
        const next = Math.max(0, prev - 1);
        setScrollOffset(0);
        return next;
      });
      return;
    }
    // Next chapter
    if (input === ']') {
      setCurrentChapterIdx(prev => {
        const next = Math.min(chapters.length - 1, prev + 1);
        setScrollOffset(0);
        return next;
      });
      return;
    }
```

- [ ] **Step 6: Add toc mode handling to useInput**

Before the normal mode section (after help mode, before the Esc handler), add:

```typescript
    // --- TOC mode ---
    if (readingMode === 'toc') {
      // TocPanel handles its own input via its own useInput
      return;
    }
```

- [ ] **Step 7: Add TocPanel to the JSX render section**

Add before the StatusBar component:

```typescript
      {readingMode === 'toc' && (
        <TocPanel
          chapters={chapters}
          currentChapterIdx={currentChapterIdx}
          onSelect={(idx) => {
            setCurrentChapterIdx(idx);
            setScrollOffset(0);
            setReadingMode('normal');
          }}
          onClose={() => setReadingMode('normal')}
        />
      )}
```

Note: Since TocPanel has its own `useInput`, and both the Reader and TocPanel will be mounted simultaneously when `readingMode === 'toc'`, we need to make sure they don't conflict. Ink's `useInput` supports an `isActive` option. We should pass `isActive` to prevent the Reader's main useInput from processing input when the TOC is open.

Actually, looking at the Ink docs for useInput: `useInput(inputHandler, options?)` where options has `isActive?: boolean`. When `isActive` is false, the handler is not called.

So we need to pass `isActive={readingMode !== 'toc'}` (or similar) to prevent handling during toc mode.

But wait — TocPanel has its own useInput hook too. Both hooks are active at the same time. This could cause issues if both try to handle the same input. The solution is that TocPanel's useInput should be the active one, and Reader's should be inactive during toc mode.

Let's also check: does the existing Reader useInput need to be wrapped with isActive for toc mode? YES — otherwise both useInput handlers will fire.

For robustness, we should ensure that *any* non-normal, non-help, non-command, non-search mode that has its own overlay component handles its own input exclusively.

Looking at the existing code, HelpPanel uses its own `useInput` but the Reader's main `useInput` ALSO runs in help mode — it just returns early from the help mode block. This is actually a conflict risk, but it "works" because the help mode handler in Reader returns immediately and the HelpPanel's useInput catches the input.

For toc mode, since we want the panel to fully own input, the cleanest approach is to:

1. Keep a `tocActive` boolean for controlling the main useInput
2. Have TocPanel handle all its input via its own useInput
3. Reader's main useInput checks `readingMode === 'toc'` and returns early

Actually, re-reading the code: the existing pattern already has early returns for each mode before normal mode. So I just need to add the toc early return BEFORE the help mode return. And TocPanel renders conditionally so it only mounts when needed.

Wait, there's a subtle issue: when both Reader and TocPanel are mounted, both `useInput` hooks fire. Ink dispatches input to all mounted `useInput` handlers. So even if Reader returns early, it still receives the input. The early return prevents action, but the hook still fires.

The best approach: use the `isActive` option on Reader's main `useInput` to disable it during toc mode.

Let me adjust Step 6:

```typescript
// Reader's main useInput call changes from:
useInput((input, key) => {
  // ... all the mode handling ...
});

// to:
useInput((input, key) => {
  // ... all the mode handling ...
}, { isActive: readingMode !== 'toc' });
```

And the toc mode early return in Step 6 is no longer needed since the entire handler won't fire.

Wait, but there's also the HelpPanel which has its own useInput. How does that work currently? The Reader's useInput handles help mode with a return. Since HelpPanel also has its own useInput, both hooks fire, but:
1. Reader checks help mode → returns early (no side effects)
2. HelpPanel handles Esc/q

This isn't ideal (two hooks fire) but works because the Reader handler is a no-op in help mode.

For TOC, since Reader already has a pattern of early returns per mode, and TocPanel needs its own useInput, we should still add the isActive guard for cleanliness. But the simpler approach, consistent with the existing HelpPanel pattern, is:

1. Reader handler returns early for toc mode (just like help mode)
2. TocPanel has its own useInput
3. When both mounted, Reader handler fires but does nothing (early return), TocPanel handles it

Add toc mode handling before the help mode section:

```typescript
    // --- TOC mode ---
    if (readingMode === 'toc') { return; }
```

This is consistent with the existing pattern. Let me finalize Step 6 with this approach.

- [ ] **Step 6 (revised): Add toc mode early return to useInput**

Add before the `// --- Help mode ---` comment:

```typescript
    // --- TOC mode (input handled by TocPanel) ---
    if (readingMode === 'toc') { return; }
```

- [ ] **Step 8: Update the currentLine / progress computation**

The currentLine calculation needs to account for chapter-relative display. Update:

```typescript
const currentLine = (() => {
  let acc = 0;
  for (let i = chapterStartLine; i < chapterEndLine && i < visualLineCounts.length; i++) {
    if (acc + visualLineCounts[i] > scrollOffset) return i + 1;
    acc += visualLineCounts[i];
  }
  return chapterEndLine;
})();

const progress = chapters.length > 0
  ? Math.round(((currentChapterIdx + 1) / chapters.length) * 100)
  : 0;
```

- [ ] **Step 9: Build and verify**

Run: `npm run build`
Expected: Bundles successfully to `dist/cli.js`

- [ ] **Step 10: Commit**

```bash
git add src/components/reader.tsx
git commit -m "feat: add chapter-constrained reading and TOC mode to Reader"
```

---

### Task 5: Update StatusBar with chapter indicator

**Files:**
- Modify: `src/components/status-bar.tsx` — add chapter info
- Modify: `src/components/reader.tsx` — pass chapter props to StatusBar

- [ ] **Step 1: Add chapterIndex and totalChapters to StatusBar props**

Update `StatusBarProps` in `status-bar.tsx`:
```typescript
interface StatusBarProps {
  // ... existing fields ...
  chapterIndex: number;
  totalChapters: number;
  chapterTitle: string;
}
```

Add the chapter indicator in the JSX, before the search info:
```typescript
const chapterInfo = totalChapters > 1 ? ` [${chapterTitle}/${totalChapters}章]` : '';
```

Add `chapterInfo` to the status line:
```typescript
<Text backgroundColor={theme.statusBarBg} color={theme.statusBarFg}>
  {` ${modeIndicator} ${fileName}${chapterInfo} [${bar}] ${progress}%  L${currentLine}/${totalLines}${searchInfo}  :help | :q | j/k ↓↑`}
</Text>
```

- [ ] **Step 2: Pass chapter props from Reader**

Update the `<StatusBar>` usage in `reader.tsx` to pass:
```typescript
chapterIndex={currentChapterIdx + 1}
totalChapters={chapters.length}
chapterTitle={chapters[currentChapterIdx]?.title ?? ''}
```

- [ ] **Step 3: Build and verify**

Run: `npm run build`
Expected: Bundles successfully

- [ ] **Step 4: Commit**

```bash
git add src/components/status-bar.tsx src/components/reader.tsx
git commit -m "feat: add chapter indicator to status bar"
```

---

### Task 6: Update HelpPanel with new shortcuts

**Files:**
- Modify: `src/components/help-panel.tsx` — add TOC and chapter shortcuts

- [ ] **Step 1: Add shortcut entries**

Add to the `shortcuts` array in `help-panel.tsx`:

After the `':goto N'` → `'Go to line N'` entry, add:
```typescript
    ['t', 'Open table of contents'],
    ['[ / ]', 'Previous / Next chapter'],
```

- [ ] **Step 2: Commit**

```bash
git add src/components/help-panel.tsx
git commit -m "feat: add chapter/TOC shortcuts to help panel"
```

---

### Task 7: Add :toc command

**Files:**
- Modify: `src/utils/commands.ts` — add 'toc' action

- [ ] **Step 1: Add 'toc' to ParsedCommand action union and parser**

In `commands.ts`, change the `ParsedCommand.action` type:
```typescript
export interface ParsedCommand {
  action: 'quit' | 'open' | 'goto' | 'search' | 'help' | 'theme' | 'encoding' | 'set' | 'toc' | 'unknown';
  args: string[];
  raw: string;
}
```

Add to the `parseCommand` function, inside the switch:
```typescript
    case 'toc':
      return { action: 'toc', args: [], raw: trimmed };
```

Also add `'toc'` to the `getCompletions` list:
```typescript
const commands = ['q', 'quit', 'open', 'help', 'toc', 'theme', 'encoding', 'set number'];
```

- [ ] **Step 2: Handle :toc in Reader's handleCommand**

In `reader.tsx`, add to the `handleCommand` switch:
```typescript
      case 'toc':
        setReadingMode('toc');
        break;
```

- [ ] **Step 3: Build and verify**

Run: `npm run build`
Expected: Bundles successfully

- [ ] **Step 4: Commit**

```bash
git add src/utils/commands.ts src/components/reader.tsx
git commit -m "feat: add :toc command"
```

---

### Task 8: Final build and smoke test

**Files:**
- Build: `npm run build`

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: Bundles successfully with no errors

- [ ] **Step 2: Quick smoke test**

Run: `node dist/cli.js --help`
Expected: Shows help text, no crashes

- [ ] **Step 3: Test with a small sample file**

Create a temporary test file with chapter markers and run the reader:
```bash
cat > /tmp/test-novel.txt << 'ENDOFFILE'
这是楔子内容，在前言章节中。
话说天下大势，分久必合，合久必分。

第一章 穿越异世界
李明睁开眼睛，发现自己躺在一个陌生的地方。
周围是茂密的森林，远处隐约可见一座城池。
他站起身，拍了拍身上的尘土。
"这是哪里？"他喃喃自语。

第二章 初到京城
经过三天的跋涉，李明终于来到了京城。
城门口有士兵把守，进出都需要检查证件。
他摸了摸怀里，还好那封信还在。
进城后，他按照地址找到了王家。

第三章 风云再起
京城的风云变幻莫测。
李明的出现，打破了这个城市的平静。
各方势力开始暗流涌动。
他不知道，一场更大的风暴正在酝酿。

尾声
故事还在继续...
ENDOFFILE
node dist/cli.js /tmp/test-novel.txt
```

Run the reader, verify:
- File opens showing "这是楔子内容" (prologue content)
- Press `]` to go to next chapter → should see "第一章 穿越异世界" content
- Press `[` to go back
- Press `t` to open TOC → shows all chapters, j/k works
- Press `/` in TOC → type "京城" → filters to chapters with "京城" in title
- Enter on a filtered chapter → jumps to it
- Press Esc to close TOC
- Press `q` to quit

- [ ] **Step 3: Commit all remaining changes**

```bash
git add -A
git commit -m "feat: add chapter-based reading and table of contents"
```
