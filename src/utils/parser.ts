import path from 'node:path';
import { Encoding, readFileLines } from './encoding.js';
import { parseEpubFile } from './epub-parser.js';
import { parseChapters } from './chapter-parser.js';
import { Chapter } from '../types.js';

export interface ParseResult {
  lines: string[];
  fileName: string;
  filePath: string;
  chapters: Chapter[];
}

/**
 * Sync parse for plain text files (.txt, .md).
 */
function parseTextFile(filePath: string, encoding?: Encoding): ParseResult {
  const lines = readFileLines(filePath, encoding);
  const chapters = parseChapters(lines);
  return {
    lines,
    fileName: path.basename(filePath, path.extname(filePath)),
    filePath,
    chapters,
  };
}

/**
 * Returns true if the file extension indicates an EPUB file.
 */
export function isEpubFile(filePath: string): boolean {
  return path.extname(filePath).toLowerCase() === '.epub';
}

/**
 * Parse text files synchronously. For EPUB files, returns null (use parseFileAsync instead).
 */
export function parseFileSync(filePath: string, encoding?: Encoding): ParseResult | null {
  if (isEpubFile(filePath)) {
    return null; // EPUB requires async parsing
  }
  return parseTextFile(filePath, encoding);
}

/**
 * Parse EPUB files asynchronously. For non-EPUB files, returns null.
 */
export async function parseFileAsync(filePath: string): Promise<ParseResult | null> {
  if (!isEpubFile(filePath)) {
    return null;
  }
  try {
    return await parseEpubFile(filePath);
  } catch {
    return null;
  }
}
