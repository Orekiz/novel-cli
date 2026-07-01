import EPub from 'epub';
import path from 'node:path';
import { Chapter } from '../types.js';
import { parseChapters } from './chapter-parser.js';

/**
 * Strip HTML tags from an HTML string, converting block elements to line breaks.
 * Returns an array of text lines ready for the reader.
 */
function stripHtml(html: string): string[] {
  // 1. Replace structural block elements with newlines
  let text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/table>/gi, '\n')
    .replace(/<\/blockquote>/gi, '\n')
    .replace(/<\/section>/gi, '\n')
    .replace(/<\/article>/gi, '\n')
    .replace(/<hr\s*\/?>/gi, '\n');

  // 2. Strip all remaining HTML tags
  text = text.replace(/<[^>]*>/g, '');

  // 3. Decode common HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&nbsp;/g, ' ');

  // 4. Split into lines, trim, collapse consecutive blank lines
  const rawLines = text.split(/\n/).map(line => line.trim());
  const result: string[] = [];
  let prevBlank = false;
  for (const line of rawLines) {
    if (line === '') {
      if (!prevBlank) result.push('');
      prevBlank = true;
    } else {
      result.push(line);
      prevBlank = false;
    }
  }
  return result;
}

export interface EpubResult {
  lines: string[];
  fileName: string;
  filePath: string;
  chapters: Chapter[];
}

/**
 * Parse an EPUB file: extract text content in spine order, build chapter list from TOC
 * (with fallback to regex-based chapter detection).
 */
export async function parseEpubFile(filePath: string): Promise<EpubResult> {
  const epub = new EPub(filePath);
  await epub.parse();

  const fileName = path.basename(filePath, path.extname(filePath));

  // Build a lookup from manifest href (normalized) to manifest id
  const hrefToId = new Map<string, string>();
  for (const [id, item] of Object.entries(epub.manifest)) {
    hrefToId.set(item.href, id);
  }

  // Concatenate all spine items in order, tracking line ranges
  const allLines: string[] = [];
  const spineRanges: { id: string; startLine: number; endLine: number }[] = [];

  for (const item of epub.flow) {
    const startLine = allLines.length;
    try {
      const html = await epub.getChapter(item.id);
      const lines = stripHtml(html);
      allLines.push(...lines);
    } catch {
      // Skip inaccessible chapters (e.g. SVG-only items)
    }
    spineRanges.push({ id: item.id, startLine, endLine: allLines.length });
  }

  // Build chapters: use EPUB TOC if available, otherwise fall back to regex
  let chapters: Chapter[];

  if (epub.toc.length > 0) {
    // Build flat chapter list from TOC entries, preserving depth for indentation.
    // Each TOC entry is mapped to a spine range by matching href → id.
    chapters = epub.toc.map((tocEntry, i) => {
      const id = tocEntry.id || hrefToId.get(tocEntry.href) || '';
      const range = spineRanges.find(r => r.id === id);

      return {
        index: i,
        title: tocEntry.title || `Chapter ${i + 1}`,
        startLine: range?.startLine ?? 0,
        endLine: range?.endLine ?? 0,
        depth: tocEntry.level ?? 0,
      } satisfies Chapter;
    });

    // Filter out TOC entries that map to empty spine ranges (no content)
    chapters = chapters.filter(ch => ch.endLine > ch.startLine || ch.startLine < allLines.length);

    // Re-index after filtering
    chapters = chapters.map((ch, i) => ({ ...ch, index: i }));
  } else {
    // No TOC: use regex-based chapter detection on the full text
    chapters = parseChapters(allLines);
  }

  return { lines: allLines, fileName, filePath, chapters };
}
