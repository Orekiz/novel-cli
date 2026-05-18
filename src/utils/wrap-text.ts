function columnWidth(ch: string): number {
  const code = ch.charCodeAt(0);
  // CJK Unified Ideographs, CJK Symbols, Fullwidth Forms, Hiragana, Katakana, Hangul
  if ((code >= 0x1100 && code <= 0x11ff) ||   // Hangul Jamo
      (code >= 0x2e80 && code <= 0x2fff) ||   // CJK Radicals
      (code >= 0x3000 && code <= 0x9fff) ||   // CJK Symbols + Ideographs
      (code >= 0xac00 && code <= 0xd7af) ||   // Hangul Syllables
      (code >= 0xf900 && code <= 0xfaff) ||   // CJK Compatibility Ideographs
      (code >= 0xfe30 && code <= 0xfe6f) ||   // CJK Compatibility Forms
      (code >= 0xff01 && code <= 0xff60) ||   // Fullwidth Forms
      (code >= 0xffe0 && code <= 0xffe6))     // Fullwidth Signs
    return 2;
  return 1;
}

export function wrapLine(line: string, width: number): string[] {
  if (width <= 0) return [line];
  const result: string[] = [];
  let current = '';
  let col = 0;

  for (const ch of line) {
    const cw = columnWidth(ch);
    if (col + cw > width && current.length > 0) {
      result.push(current);
      current = '';
      col = 0;
    }
    current += ch;
    col += cw;
  }

  if (current) result.push(current);
  return result.length > 0 ? result : [''];
}

export function totalVisualLines(lines: string[], width: number): number {
  return lines.reduce((sum, line) => sum + wrapLine(line, width).length, 0);
}

export function getVisualLineCount(lines: string[], width: number): number[] {
  return lines.map(line => wrapLine(line, width).length);
}
