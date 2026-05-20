import React from 'react';
import { Box, Text } from 'ink';
import { Theme, ReadingMode } from '../types.js';

interface StatusBarProps {
  progress: number;
  fileName: string;
  theme: Theme;
  readingMode: ReadingMode;
  searchMatches: number;
  currentMatch: number;
  chapterIndex: number;
  totalChapters: number;
  chapterTitle: string;
}

export default function StatusBar({
  progress, fileName, theme, readingMode, searchMatches, currentMatch,
  chapterIndex, totalChapters, chapterTitle,
}: StatusBarProps) {
  const progressBarWidth = 20;
  const filled = Math.round((progress / 100) * progressBarWidth);
  const bar = '█'.repeat(filled) + '░'.repeat(progressBarWidth - filled);

  const modeIndicator = readingMode === 'normal' ? 'NORMAL' :
    readingMode === 'command' ? 'CMD' :
    readingMode === 'search' ? 'SEARCH' :
    readingMode === 'help' ? 'HELP' : '';

  const searchInfo = searchMatches > 0 ? ` [${currentMatch}/${searchMatches}]` : '';
  const chapterInfo = totalChapters > 1 ? ` [${chapterTitle}/${totalChapters}章]` : '';

  return (
    <Box flexDirection="column" width="100%" minWidth={80}>
      <Text color={theme.statusBarFg}>{'─'.repeat(80)}</Text>
      <Text backgroundColor={theme.statusBarBg} color={theme.statusBarFg}>
        {` ${modeIndicator} ${fileName}${chapterInfo} [${bar}] ${progress}%${searchInfo}  :help | :q | j/k ↓↑`}
      </Text>
    </Box>
  );
}
