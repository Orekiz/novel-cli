import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { useFile } from '../hooks/use-file.js';
import { useTheme } from '../hooks/use-theme.js';
import { getVisualLineCount, wrapLine } from '../utils/wrap-text.js';
import { updateHistory, getLastPosition, getBookmarks, setBookmark } from '../utils/storage.js';
import { parseCommand } from '../utils/commands.js';
import TextViewer from './text-viewer.js';
import StatusBar from './status-bar.js';
import CommandBar from './command-bar.js';
import SearchBar from './search-bar.js';
import HelpPanel from './help-panel.js';
import TocPanel from './toc-panel.js';
import { ReadingMode } from '../types.js';
import { parseChapters } from '../utils/chapter-parser.js';

interface ReaderProps {
  filePath: string | null;
  encoding?: string;
  onGoBack: () => void;
  onOpenFile: (path: string) => void;
  onSetEncoding: (enc: string) => void;
}

const HALF_PAGE_FACTOR = 0.45;

export default function Reader({ filePath, encoding, onGoBack, onOpenFile, onSetEncoding }: ReaderProps) {
  const fileResult = useFile(filePath, encoding as any);
  const { theme } = useTheme();
  const { stdout } = useStdout();

  const termWidth = stdout.columns || 80;
  const termHeight = stdout.rows || 24;
  const statusBarHeight = 2;
  const paddingWidth = 2;
  const lineNumWidth = 6;

  const [readingMode, setReadingMode] = useState<ReadingMode>('normal');
  const [commandInput, setCommandInput] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [scrollOffset, setScrollOffset] = useState(0);
  const [showLineNumbers, setShowLineNumbers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatches, setSearchMatches] = useState<number[]>([]);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [bookmarkLine, setBookmarkLine] = useState<number | null>(null);
  const [fileLoaded, setFileLoaded] = useState(false);

  const overlayLines = (readingMode === 'command' || readingMode === 'search') ? 2 : 0;
  const viewerHeight = termHeight - statusBarHeight - overlayLines;

  const lines = fileResult?.lines ?? [];
  const contentWidth = termWidth - paddingWidth - (showLineNumbers ? lineNumWidth : 0);
  const visualLineCounts = useMemo(
    () => getVisualLineCount(lines, contentWidth),
    [lines, contentWidth]
  );
  const totalVisualLines = visualLineCounts.reduce((a, b) => a + b, 0);
  const chapters = useMemo(() => fileResult ? parseChapters(lines) : [], [lines, fileResult]);
  const [currentChapterIdx, setCurrentChapterIdx] = useState(0);
  const currentChapter = chapters[currentChapterIdx] || chapters[0];
  const chapterStartLine = currentChapter?.startLine ?? 0;
  const chapterEndLine = currentChapter?.endLine ?? lines.length;
  const chapterVisualStart = visualLineCounts.slice(0, chapterStartLine).reduce((a, b) => a + b, 0);
  const chapterVisualCount = visualLineCounts.slice(chapterStartLine, chapterEndLine).reduce((a, b) => a + b, 0);
  const maxOffset = Math.max(0, chapterVisualCount - viewerHeight);

  // Load last position on file open
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

      // Compute scroll offset within chapter
      const ch = chapters[chapterIdx];
      if (ch) {
        const startVisual = visualLineCounts.slice(0, ch.startLine).reduce((a, b) => a + b, 0);
        const chVisualCount = visualLineCounts.slice(ch.startLine, ch.endLine).reduce((a, b) => a + b, 0);
        const posVisual = visualLineCounts.slice(0, lastPos).reduce((a, b) => a + b, 0) - startVisual;
        setScrollOffset(Math.max(0, Math.min(posVisual - Math.floor(viewerHeight / 3), chVisualCount - viewerHeight)));
      }

      setFileLoaded(true);

      const bookmarks = getBookmarks();
      if (bookmarks[fileResult.filePath] !== undefined) {
        setBookmarkLine(bookmarks[fileResult.filePath]);
      }
    }
  }, [fileResult, fileLoaded, visualLineCounts, viewerHeight, chapters]);

  // Save position on scroll
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

  const halfPage = Math.max(1, Math.floor(viewerHeight * HALF_PAGE_FACTOR));

  useInput((input, key) => {
    // --- Command mode ---
    if (readingMode === 'command') {
      if (key.escape) { setReadingMode('normal'); setCommandInput(''); return; }
      if (key.return) { handleCommand(`:${commandInput}`); setCommandInput(''); return; }
      if (key.backspace || key.delete) {
        setCommandInput(prev => prev.length > 0 ? prev.slice(0, -1) : prev);
        return;
      }
      if (input && !key.ctrl && !key.meta) {
        setCommandInput(prev => prev + input);
      }
      return;
    }

    // --- Search mode ---
    if (readingMode === 'search') {
      if (key.escape) { setReadingMode('normal'); setSearchInput(''); return; }
      if (key.return) { handleSearch(searchInput); setSearchInput(''); return; }
      if (key.backspace || key.delete) {
        setSearchInput(prev => prev.length > 0 ? prev.slice(0, -1) : prev);
        return;
      }
      if (input && !key.ctrl && !key.meta) {
        setSearchInput(prev => prev + input);
      }
      return;
    }

    // --- TOC mode (input handled by TocPanel) ---
    if (readingMode === 'toc') { return; }

    // --- Help mode ---
    if (readingMode === 'help') {
      if (key.escape || input === 'q') {
        setReadingMode('normal');
      }
      return;
    }

    // --- Normal mode ---
    // Esc in normal mode goes back to bookshelf
    if (key.escape) {
      onGoBack();
      return;
    }

    // Scroll down
    if (input === 'j' || key.downArrow) {
      setScrollOffset(prev => Math.min(prev + 1, maxOffset));
      return;
    }
    // Scroll up
    if (input === 'k' || key.upArrow) {
      setScrollOffset(prev => Math.max(0, prev - 1));
      return;
    }
    // Half page down
    if ((key.ctrl && input === 'd') || key.pageDown) {
      setScrollOffset(prev => Math.min(prev + halfPage, maxOffset));
      return;
    }
    // Half page up
    if ((key.ctrl && input === 'u') || key.pageUp) {
      setScrollOffset(prev => Math.max(0, prev - halfPage));
      return;
    }
    // Go to start
    if (input === 'g' && !key.shift) {
      setScrollOffset(0);
      return;
    }
    // Go to end (G or Shift+g)
    if (input === 'G' || (input === 'g' && key.shift)) {
      setScrollOffset(maxOffset);
      return;
    }
    // Search next
    if (input === 'n' && searchMatches.length > 0) {
      const nextIdx = (currentMatch + 1) % searchMatches.length;
      setCurrentMatch(nextIdx);
      jumpToLine(searchMatches[nextIdx]);
      return;
    }
    // Search prev
    if (input === 'N' && searchMatches.length > 0) {
      const prevIdx = (currentMatch - 1 + searchMatches.length) % searchMatches.length;
      setCurrentMatch(prevIdx);
      jumpToLine(searchMatches[prevIdx]);
      return;
    }
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
    // Enter command mode
    if (input === ':') { setReadingMode('command'); setCommandInput(''); return; }
    if (key.ctrl && input === 'p') { setReadingMode('command'); setCommandInput(''); return; }
    // Enter search mode
    if (input === '/') { setReadingMode('search'); setSearchInput(''); return; }
    // Add bookmark
    if (input === 'm' && fileResult) {
      let logLine = 0;
      let acc = 0;
      for (let i = 0; i < visualLineCounts.length; i++) {
        if (acc + visualLineCounts[i] > scrollOffset) { logLine = i; break; }
        acc += visualLineCounts[i];
        logLine = i + 1;
      }
      setBookmarkLine(logLine);
      setBookmark(fileResult.filePath, logLine);
      return;
    }
    // Jump to bookmark
    if (input === '`' && bookmarkLine !== null) {
      const visualOff = visualLineCounts.slice(0, bookmarkLine).reduce((a, b) => a + b, 0);
      setScrollOffset(Math.max(0, Math.min(visualOff, maxOffset)));
      return;
    }
  });

  // Compute visible lines
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

  // Current line for status bar
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

  const jumpToLine = (line: number) => {
    // Find which chapter contains this line and scroll there
    let targetChapter = 0;
    for (let i = 0; i < chapters.length; i++) {
      if (line >= chapters[i].startLine && line < chapters[i].endLine) {
        targetChapter = i;
        break;
      }
    }
    // If match is past end of current chapter's range, pin to last chapter
    if (line >= lines.length) {
      targetChapter = chapters.length - 1;
    }
    setCurrentChapterIdx(targetChapter);
    const ch = chapters[targetChapter];
    if (ch) {
      const startVisual = visualLineCounts.slice(0, ch.startLine).reduce((a, b) => a + b, 0);
      const lineVisual = visualLineCounts.slice(0, line).reduce((a, b) => a + b, 0);
      const offsetInChapter = lineVisual - startVisual;
      const chVisualCount = visualLineCounts.slice(ch.startLine, ch.endLine).reduce((a, b) => a + b, 0);
      setScrollOffset(Math.max(0, Math.min(offsetInChapter, chVisualCount - viewerHeight)));
    }
  };

  const handleSearch = (query: string) => {
    if (!query.trim()) { setReadingMode('normal'); return; }
    setSearchQuery(query);
    const matches: number[] = [];
    lines.forEach((line, idx) => {
      if (line.toLowerCase().includes(query.toLowerCase())) {
        matches.push(idx);
      }
    });
    setSearchMatches(matches);
    setCurrentMatch(0);
    if (matches.length > 0) {
      jumpToLine(matches[0]);
    }
    setReadingMode('normal');
  };

  const handleCommand = (input: string) => {
    const parsed = parseCommand(input);
    switch (parsed.action) {
      case 'quit':
        process.exit(0);
        break;
      case 'open':
        if (parsed.args[0]) onOpenFile(parsed.args[0]);
        break;
      case 'help':
        setReadingMode('help');
        break;
      case 'goto': {
        const targetLine = parseInt(parsed.args[0], 10) - 1;
        if (targetLine >= 0 && targetLine < lines.length) {
          jumpToLine(targetLine);
        }
        break;
      }
      case 'search': {
        const q = parsed.args.join(' ');
        setSearchQuery(q);
        const matches: number[] = [];
        lines.forEach((line, idx) => {
          if (q && line.toLowerCase().includes(q.toLowerCase())) {
            matches.push(idx);
          }
        });
        setSearchMatches(matches);
        setCurrentMatch(0);
        if (matches.length > 0) {
          jumpToLine(matches[0]);
        }
        break;
      }
      case 'set':
        if (parsed.args.includes('number')) {
          setShowLineNumbers(prev => !prev);
        }
        break;
      case 'encoding':
        if (parsed.args[0]) onSetEncoding(parsed.args[0]);
        break;
      case 'toc':
        setReadingMode('toc');
        break;
    }
    setReadingMode('normal');
  };

  if (!fileResult) {
    return <Box><Text>No file loaded. Press Esc to go back.</Text></Box>;
  }

  return (
    <Box flexDirection="column" flexGrow={1} width="100%">
      <Box height={viewerHeight} overflowY="hidden">
        <TextViewer
          lines={visibleLines}
          showLineNumbers={showLineNumbers}
          highlightColor={theme.highlight}
          searchMatches={searchMatches}
          currentMatch={currentMatch}
        />
      </Box>

      {readingMode === 'search' && (
        <SearchBar query={searchInput} />
      )}

      {readingMode === 'command' && (
        <CommandBar input={commandInput} />
      )}

      {readingMode === 'help' && <HelpPanel onClose={() => setReadingMode('normal')} />}

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

      <StatusBar
        progress={progress}
        currentLine={currentLine}
        totalLines={lines.length}
        fileName={fileResult.fileName}
        theme={theme}
        readingMode={readingMode}
        searchMatches={searchMatches.length}
        currentMatch={currentMatch + 1}
        chapterIndex={currentChapterIdx + 1}
        totalChapters={chapters.length}
        chapterTitle={chapters[currentChapterIdx]?.title ?? ''}
      />
    </Box>
  );
}
