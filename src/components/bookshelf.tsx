import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { getHistory } from '../utils/storage.js';
import { RecentFile } from '../types.js';
import FileBrowser from './file-browser.js';

interface BookshelfProps {
  onOpenFile: (filePath: string) => void;
  startInBrowse?: boolean;
}

export default function Bookshelf({ onOpenFile, startInBrowse }: BookshelfProps) {
  const [showBrowser, setShowBrowser] = useState(!!startInBrowse);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>(() => getHistory());
  const [selectedIdx, setSelectedIdx] = useState(0);

  const totalOptions = 1 + recentFiles.length + 1;

  // useInput must be called before any early return (React hooks rule)
  useInput((input, key) => {
    // When browser is shown, let FileBrowser handle input instead
    if (showBrowser) return;
    if (key.escape) { process.exit(0); }
    if (key.upArrow || input === 'k') {
      setSelectedIdx(prev => Math.max(0, prev - 1));
    }
    if (key.downArrow || input === 'j') {
      setSelectedIdx(prev => Math.min(totalOptions - 1, prev + 1));
    }
    if (key.return) {
      if (selectedIdx === 0 && recentFiles.length > 0) {
        onOpenFile(recentFiles[0].path);
      } else if (selectedIdx === 0 && recentFiles.length === 0) {
        setShowBrowser(true);
      } else if (selectedIdx <= recentFiles.length) {
        const file = recentFiles[selectedIdx - 1];
        if (file) onOpenFile(file.path);
      } else {
        setShowBrowser(true);
      }
    }
  });

  if (showBrowser) {
    return (
      <FileBrowser
        onSelect={(path) => onOpenFile(path)}
        onCancel={() => setShowBrowser(false)}
      />
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1} padding={2} width="100%">
      <Box marginBottom={1}>
        <Text bold inverse> Novel Reader Cli - Bookshelf </Text>
      </Box>

      <Box>
        <Text color={selectedIdx === 0 ? 'green' : undefined}>
          {selectedIdx === 0 ? '▸ ' : '  '}
        </Text>
        <Text bold={selectedIdx === 0}>
          {recentFiles.length > 0
            ? `▶ Resume "${recentFiles[0].name}" (${recentFiles[0].lastPosition} lines in)`
            : '▶ Open a file'}
        </Text>
      </Box>

      {recentFiles.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>── Recent Files ──</Text>
          {recentFiles.map((file, idx) => {
            const optionIdx = idx + 1;
            return (
              <Box key={file.path}>
                <Text color={selectedIdx === optionIdx ? 'green' : undefined}>
                  {selectedIdx === optionIdx ? '▸ ' : '  '}
                </Text>
                <Text>{file.name}</Text>
                <Text dimColor> — {file.lastPosition} lines</Text>
              </Box>
            );
          })}
        </Box>
      )}

      <Box marginTop={1}>
        <Text color={selectedIdx === totalOptions - 1 ? 'green' : undefined}>
          {selectedIdx === totalOptions - 1 ? '▸ ' : '  '}
        </Text>
        <Text bold={selectedIdx === totalOptions - 1}>
          📁 Browse files...
        </Text>
      </Box>

      <Box marginTop={2}>
        <Text dimColor>j/k navigate · Enter select · q quit</Text>
      </Box>
    </Box>
  );
}
