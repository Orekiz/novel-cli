import React, { useState, useCallback } from 'react';
import { Box, useStdout } from 'ink';
import { ThemeProvider } from './hooks/use-theme.js';
import Bookshelf from './components/bookshelf.js';
import Reader from './components/reader.js';

interface AppProps {
  initialFile: string | null;
  encoding?: string;
  showBookshelf: boolean;
  initialBrowse: boolean;
}

function AppContent({ initialFile, encoding, showBookshelf, initialBrowse }: AppProps) {
  const { stdout } = useStdout();
  const columns = stdout.columns || 80;
  const rows = stdout.rows || 24;

  const [mode, setMode] = useState<'bookshelf' | 'reading'>(
    showBookshelf ? 'bookshelf' : 'reading'
  );
  const [filePath, setFilePath] = useState<string | null>(initialFile);
  const [currentEncoding, setCurrentEncoding] = useState<string | undefined>(encoding);

  const handleOpenFile = useCallback((path: string) => {
    setFilePath(path);
    setMode('reading');
  }, []);

  const handleGoBack = useCallback(() => {
    setMode('bookshelf');
  }, []);

  return (
    <Box flexDirection="column" width={columns} height={rows}>
      {mode === 'bookshelf' ? (
        <Bookshelf onOpenFile={handleOpenFile} startInBrowse={initialBrowse} />
      ) : (
        <Reader
          filePath={filePath}
          encoding={currentEncoding}
          onGoBack={handleGoBack}
          onOpenFile={handleOpenFile}
          onSetEncoding={setCurrentEncoding}
        />
      )}
    </Box>
  );
}

export default function App(props: AppProps) {
  return (
    <ThemeProvider>
      <AppContent {...props} />
    </ThemeProvider>
  );
}
