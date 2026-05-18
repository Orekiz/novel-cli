import { useMemo } from 'react';
import { readFileLines, Encoding } from '../utils/encoding.js';

export interface FileResult {
  lines: string[];
  fileName: string;
  filePath: string;
  encoding: Encoding;
}

export function useFile(filePath: string | null, encoding?: Encoding): FileResult | null {
  return useMemo(() => {
    if (!filePath) return null;
    try {
      const enc = encoding || undefined;
      const lines = readFileLines(filePath, enc);
      return {
        lines,
        fileName: filePath.split('/').pop() || filePath,
        filePath,
        encoding: enc || 'utf-8',
      };
    } catch {
      return null;
    }
  }, [filePath, encoding]);
}
