import { Chapter } from '../types.js';

// Pattern 1: 第X章/节/回/卷 (Chapter/Section/Volume with Chinese numerals)
const CHAPTER_PATTERN = /^第[一二三四五六七八九十百零〇\d]+[章节回卷]/;

// Pattern 2: Numbered title (e.g. "001 引子", "1.标题", "02 开始")
const NUMBERED_TITLE_PATTERN = /^\d+[.、．\s]+/;

export function isChapterHeading(line: string): boolean {
  return CHAPTER_PATTERN.test(line) || NUMBERED_TITLE_PATTERN.test(line);
}

export function parseChapters(lines: string[]): Chapter[] {
  // Find the first heading
  let firstHeadingIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (isChapterHeading(lines[i])) {
      firstHeadingIdx = i;
      break;
    }
  }

  // No chapters detected — single "full text" chapter
  if (firstHeadingIdx === -1) {
    return [{ index: 0, title: '全文', startLine: 0, endLine: lines.length }];
  }

  const chapters: Chapter[] = [];

  // Prologue: content before first heading (only if non-empty)
  if (firstHeadingIdx > 0) {
    chapters.push({ index: 0, title: '前言', startLine: 0, endLine: firstHeadingIdx });
  }

  // Scan for chapter headings
  let chapterStart = firstHeadingIdx;
  let chapterTitle = lines[firstHeadingIdx];

  for (let i = firstHeadingIdx + 1; i < lines.length; i++) {
    if (isChapterHeading(lines[i])) {
      chapters.push({
        index: chapters.length,
        title: chapterTitle,
        startLine: chapterStart,
        endLine: i,
      });
      chapterStart = i;
      chapterTitle = lines[i];
    }
  }

  // Last chapter (absorbs trailing content)
  chapters.push({
    index: chapters.length,
    title: chapterTitle,
    startLine: chapterStart,
    endLine: lines.length,
  });

  return chapters;
}
