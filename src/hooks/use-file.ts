import { useState, useEffect } from 'react';
import { Encoding } from '../utils/encoding.js';
import { parseFileSync, parseFileAsync, isEpubFile } from '../utils/parser.js';
import { Chapter } from '../types.js';

export interface FileResult {
  lines: string[];
  fileName: string;
  filePath: string;
  chapters: Chapter[];
}

export function useFile(filePath: string | null, encoding?: Encoding): FileResult | null {
  const [result, setResult] = useState<FileResult | null>(() => {
    // Sync init: handle text files immediately, return null for EPUB (will load in effect)
    if (!filePath) return null;
    try {
      return parseFileSync(filePath, encoding);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!filePath) {
      setResult(null);
      return;
    }

    if (isEpubFile(filePath)) {
      // Async load for EPUB
      let cancelled = false;
      parseFileAsync(filePath).then(epubResult => {
        if (!cancelled && epubResult) {
          setResult(epubResult);
        }
      });
      return () => { cancelled = true; };
    } else {
      // Sync load for text files (handles encoding changes)
      try {
        setResult(parseFileSync(filePath, encoding));
      } catch {
        setResult(null);
      }
    }
  }, [filePath, encoding]);

  return result;
}
