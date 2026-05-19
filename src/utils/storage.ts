import fs from 'node:fs';
import path from 'node:path';
import { RecentFile, KeyBindings } from '../types.js';

const DATA_DIR = path.join(process.env.HOME || process.env.USERPROFILE || '', '.novel-reader');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const BOOKMARKS_FILE = path.join(DATA_DIR, 'bookmarks.json');
const KEYMAP_FILE = path.join(DATA_DIR, 'keymap.json');

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJSON<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch { /* ignore corrupt files */ }
  return fallback;
}

function writeJSON(filePath: string, data: unknown): void {
  ensureDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// --- History (recent files + last positions) ---

export function getHistory(): RecentFile[] {
  return readJSON<RecentFile[]>(HISTORY_FILE, []);
}

export function updateHistory(filePath: string, lastPosition: number): void {
  const history = getHistory();
  const idx = history.findIndex(h => h.path === filePath);
  const entry: RecentFile = {
    path: filePath,
    name: path.basename(filePath),
    lastPosition,
    lastReadAt: new Date().toISOString(),
  };
  if (idx >= 0) {
    history[idx] = entry;
  } else {
    history.unshift(entry);
  }
  writeJSON(HISTORY_FILE, history.slice(0, 20));
}

export function getLastPosition(filePath: string): number {
  const history = getHistory();
  return history.find(h => h.path === filePath)?.lastPosition ?? 0;
}

// --- Bookmarks ---

export interface BookmarksData {
  [filePath: string]: number;
}

export function getBookmarks(): BookmarksData {
  return readJSON<BookmarksData>(BOOKMARKS_FILE, {});
}

export function setBookmark(filePath: string, line: number): void {
  const bookmarks = getBookmarks();
  bookmarks[filePath] = line;
  writeJSON(BOOKMARKS_FILE, bookmarks);
}

// --- Keymap ---

const defaultKeyBindings: KeyBindings = {
  scrollDown: ['j', 'down'],
  scrollUp: ['k', 'up'],
  halfPageDown: ['ctrl+d', 'pagedown'],
  halfPageUp: ['ctrl+u', 'pageup'],
  goToStart: ['g'],
  goToEnd: ['G'],
  searchNext: ['n'],
  searchPrev: ['N'],
  enterCommand: [':', 'ctrl+p'],
  enterSearch: ['/'],
  escape: ['escape'],
  addBookmark: ['m'],
  jumpBookmark: ['`'],
  openToc: ['t'],
  prevChapter: ['['],
  nextChapter: [']'],
};

export function getKeyBindings(): KeyBindings {
  return readJSON<KeyBindings>(KEYMAP_FILE, defaultKeyBindings);
}
