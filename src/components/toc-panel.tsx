import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { Chapter } from '../types.js';
import { useTheme } from '../hooks/use-theme.js';

interface TocPanelProps {
  chapters: Chapter[];
  currentChapterIdx: number;
  onSelect: (chapterIdx: number) => void;
  onClose: () => void;
  maxHeight: number;
}

const HEADER_LINES = 8; // border top + padding top + title + title margin + list margin + hint + padding bottom + border bottom
const SEARCH_LINES = 2; // search input line + marginBottom

export default function TocPanel({ chapters, currentChapterIdx, onSelect, onClose, maxHeight }: TocPanelProps) {
  const { theme } = useTheme();
  const [mode, setMode] = useState<'browse' | 'search'>('browse');
  const [selectedIdx, setSelectedIdx] = useState(currentChapterIdx);
  const [searchInput, setSearchInput] = useState('');
  const [listOffset, setListOffset] = useState(() => {
    const visible = maxHeight - HEADER_LINES;
    const target = currentChapterIdx - Math.floor(visible / 2);
    return Math.max(0, Math.min(target, Math.max(0, chapters.length - visible)));
  });

  const filteredChapters = useMemo(() => {
    if (!searchInput.trim()) return chapters;
    const q = searchInput.toLowerCase();
    return chapters.filter(ch => ch.title.toLowerCase().includes(q));
  }, [chapters, searchInput]);

  const displayList = filteredChapters.length > 0 ? filteredChapters : chapters;
  const safeSelectedIdx = Math.min(selectedIdx, displayList.length - 1);
  const visibleLines = maxHeight - HEADER_LINES - (mode === 'search' ? SEARCH_LINES : 0);

  useInput((input, key) => {
    if (mode === 'search') {
      if (key.escape) {
        setMode('browse');
        setSearchInput('');
        return;
      }
      if (key.return) {
        if (filteredChapters.length > 0) {
          const targetIdx = filteredChapters[Math.min(safeSelectedIdx, filteredChapters.length - 1)].index;
          onSelect(targetIdx);
        }
        return;
      }
      if (key.backspace || key.delete) {
        setSearchInput(prev => prev.slice(0, -1));
        return;
      }
      if (key.upArrow) {
        setSelectedIdx(prev => {
          const next = Math.max(0, prev - 1);
          if (next < listOffset) setListOffset(next);
          return next;
        });
        return;
      }
      if (key.downArrow) {
        setSelectedIdx(prev => {
          const next = Math.min(displayList.length - 1, prev + 1);
          if (next >= listOffset + visibleLines) setListOffset(next - visibleLines + 1);
          return next;
        });
        return;
      }
      if (input && !key.ctrl && !key.meta) {
        setSearchInput(prev => prev + input);
        setSelectedIdx(0);
        setListOffset(0);
      }
      return;
    }

    // Browse mode
    if (key.escape) { onClose(); return; }
    if (key.upArrow || input === 'k') {
      setSelectedIdx(prev => {
        const next = Math.max(0, prev - 1);
        if (next < listOffset) {
          setListOffset(next);
        }
        return next;
      });
      return;
    }
    if (key.downArrow || input === 'j') {
      setSelectedIdx(prev => {
        const next = Math.min(displayList.length - 1, prev + 1);
        if (next >= listOffset + visibleLines) {
          setListOffset(next - visibleLines + 1);
        }
        return next;
      });
      return;
    }
    if (key.return) {
      onSelect(displayList[safeSelectedIdx].index);
      return;
    }
    if (input === '/') {
      setMode('search');
      setSearchInput('');
      setListOffset(0);
      return;
    }
  });

  const indicatorColor = theme.highlight || 'cyan';
  const visibleChapters = displayList.slice(listOffset, listOffset + visibleLines);

  return (
    <Box flexDirection="column" padding={1} borderStyle="round">
      <Box marginBottom={1}>
        <Text bold inverse> Table of Contents </Text>
        {displayList.length > visibleLines && (
          <Text dimColor>  ({listOffset + 1}-{Math.min(listOffset + visibleLines, displayList.length)}/{displayList.length})</Text>
        )}
      </Box>

      {mode === 'search' && (
        <Box marginBottom={1}>
          <Text bold color="cyan">/</Text>
          <Text>{searchInput || 'Search chapters...'}</Text>
          <Text dimColor>  (Esc to cancel)</Text>
        </Box>
      )}

      <Box flexDirection="column" marginBottom={1}>
        {visibleChapters.map((ch, idx) => {
          const actualIdx = listOffset + idx;
          const isCurrent = ch.index === currentChapterIdx;
          const isSelected = actualIdx === safeSelectedIdx;
          const prefix = isSelected ? '▸ ' : '  ';
          const suffix = isCurrent ? '  ←' : '';
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
        })}
        {filteredChapters.length === 0 && searchInput.trim() && (
          <Text dimColor>  No matching chapters</Text>
        )}
      </Box>

      <Text dimColor>
        {mode === 'browse'
          ? 'j/k navigate · / search · Enter select · Esc close'
          : '↑/↓ navigate · Type to filter · Enter select · Esc cancel'}
      </Text>
    </Box>
  );
}
