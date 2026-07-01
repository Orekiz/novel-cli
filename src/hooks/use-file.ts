import { useState, useEffect, useRef } from 'react';
import { Encoding } from '../utils/encoding.js';
import { parseFileSync, parseFileAsync, isEpubFile, ParseResult } from '../utils/parser.js';

export type FileResult = ParseResult;

export function useFile(filePath: string | null, encoding?: Encoding): FileResult | null {
  const lastSyncKey = useRef<string | null>(null);

  const [result, setResult] = useState<FileResult | null>(() => {
    // Sync init: handle text files immediately, return null for EPUB (will load in effect)
    if (!filePath) return null;
    try {
      const parsed = parseFileSync(filePath, encoding);
      if (parsed) lastSyncKey.current = `${filePath}:${encoding ?? ''}`;
      return parsed;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!filePath) {
      setResult(null);
      lastSyncKey.current = null;
      return;
    }

    if (isEpubFile(filePath)) {
      lastSyncKey.current = null;
      // Async load for EPUB
      let cancelled = false;
      parseFileAsync(filePath).then(epubResult => {
        if (!cancelled && epubResult) {
          setResult(epubResult);
        }
      });
      return () => { cancelled = true; };
    } else {
      // Sync load for text files (only re-parse if deps actually changed)
      const key = `${filePath}:${encoding ?? ''}`;
      if (key === lastSyncKey.current) return;
      lastSyncKey.current = key;
      try {
        setResult(parseFileSync(filePath, encoding));
      } catch {
        setResult(null);
      }
    }
  }, [filePath, encoding]);

  return result;
}
