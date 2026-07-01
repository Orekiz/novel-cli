import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import fs from 'node:fs';
import path from 'node:path';

interface FileBrowserProps {
  onSelect: (filePath: string) => void;
  onCancel: () => void;
  initialDir?: string;
}

interface DirEntry {
  name: string;
  isDir: boolean;
  path: string;
}

export default function FileBrowser({ onSelect, onCancel, initialDir }: FileBrowserProps) {
  const [currentDir, setCurrentDir] = useState(initialDir || process.cwd());
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    try {
      const items = fs.readdirSync(currentDir, { withFileTypes: true });
      const dirList: DirEntry[] = [];
      const fileList: DirEntry[] = [];

      if (currentDir !== '/') {
        dirList.push({ name: '..', isDir: true, path: path.dirname(currentDir) });
      }

      for (const item of items) {
        const fullPath = path.join(currentDir, item.name);
        if (item.isDirectory()) {
          dirList.push({ name: item.name, isDir: true, path: fullPath });
        } else if (item.name.endsWith('.txt') || item.name.endsWith('.md') || item.name.endsWith('.epub')) {
          fileList.push({ name: item.name, isDir: false, path: fullPath });
        }
      }

      setEntries([...dirList, ...fileList]);
      setCursor(0);
    } catch {
      setEntries([]);
    }
  }, [currentDir]);

  useInput((input, key) => {
    if (key.escape) { onCancel(); return; }
    if (key.upArrow || input === 'k') {
      setCursor(prev => Math.max(0, prev - 1));
      return;
    }
    if (key.downArrow || input === 'j') {
      setCursor(prev => Math.min(entries.length - 1, prev + 1));
      return;
    }
    if (key.return) {
      const selected = entries[cursor];
      if (!selected) return;
      if (selected.isDir) {
        setCurrentDir(selected.path);
      } else {
        onSelect(selected.path);
      }
    }
  });

  return (
    <Box flexDirection="column" flexGrow={1} padding={1} width="100%">
      <Text bold inverse> File Browser </Text>
      <Text dimColor>{currentDir}</Text>
      <Box flexDirection="column" marginTop={1}>
        {entries.map((entry, idx) => (
          <Box key={entry.path}>
            <Text color={idx === cursor ? 'green' : undefined}>
              {idx === cursor ? '▸ ' : '  '}
            </Text>
            <Text color={entry.isDir ? 'cyan' : undefined} bold={entry.isDir}>
              {entry.isDir ? '📁 ' : '📄 '}
              {entry.name}
            </Text>
          </Box>
        ))}
      </Box>
      {entries.length === 0 && <Text dimColor>(empty directory)</Text>}
      <Box marginTop={1}>
        <Text dimColor>j/k navigate · Enter select · Esc back</Text>
      </Box>
    </Box>
  );
}
