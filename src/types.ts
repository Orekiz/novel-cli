export type AppMode = 'bookshelf' | 'reading';

export type ReadingMode = 'normal' | 'command' | 'search' | 'help' | 'toc';

export interface Theme {
  name: string;
  foreground: string;
  background: string;
  highlight: string;
  statusBarBg: string;
  statusBarFg: string;
}

export interface Chapter {
  index: number;
  title: string;
  startLine: number;
  endLine: number;
}

export interface RecentFile {
  path: string;
  name: string;
  lastProgress: number;  // 0-100 percentage based on chapters read
  lastReadAt: string;
}

export interface AppState {
  mode: AppMode;
  readingMode: ReadingMode;
  filePath: string | null;
  fileName: string;
  lines: string[];
  scrollOffset: number;
  terminalWidth: number;
  terminalHeight: number;
  searchQuery: string;
  searchMatches: number[];
  currentMatchIndex: number;
  bookmark: number | null;
  theme: Theme;
  showLineNumbers: boolean;
  recentFiles: RecentFile[];
  commandInput: string;
  searchInput: string;
}

export interface KeyBindings {
  scrollDown: string[];
  scrollUp: string[];
  halfPageDown: string[];
  halfPageUp: string[];
  goToStart: string[];
  goToEnd: string[];
  searchNext: string[];
  searchPrev: string[];
  enterCommand: string[];
  enterSearch: string[];
  escape: string[];
  addBookmark: string[];
  jumpBookmark: string[];
  openToc: string[];
  prevChapter: string[];
  nextChapter: string[];
}
