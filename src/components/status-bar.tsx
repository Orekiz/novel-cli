import React from 'react';
import { Box, Text } from 'ink';
import { Theme, ReadingMode } from '../types.js';

interface StatusBarProps {
  progress: number;
  currentLine: number;
  totalLines: number;
  fileName: string;
  theme: Theme;
  readingMode: ReadingMode;
  searchMatches: number;
  currentMatch: number;
}

export default function StatusBar({
  progress, currentLine, totalLines, fileName, theme, readingMode, searchMatches, currentMatch,
}: StatusBarProps) {
  const progressBarWidth = 20;
  const filled = Math.round((progress / 100) * progressBarWidth);
  const bar = '█'.repeat(filled) + '░'.repeat(progressBarWidth - filled);

  const modeIndicator = readingMode === 'normal' ? 'NORMAL' :
    readingMode === 'command' ? 'CMD' :
    readingMode === 'search' ? 'SEARCH' :
    readingMode === 'help' ? 'HELP' : '';

  const searchInfo = searchMatches > 0 ? ` [${currentMatch}/${searchMatches}]` : '';

  return (
    <Box flexDirection="column" width="100%" minWidth={80}>
      <Text color={theme.statusBarFg}>{'─'.repeat(80)}</Text>
      <Text backgroundColor={theme.statusBarBg} color={theme.statusBarFg}>
        {` ${modeIndicator} ${fileName} [${bar}] ${progress}%  L${currentLine}/${totalLines}${searchInfo}  :help | :q | j/k ↓↑`}
      </Text>
    </Box>
  );
}
