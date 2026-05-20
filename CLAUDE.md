# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run build` — bundle with esbuild (entry: `src/index.ts` → `dist/cli.js`)
- `npm run dev` — esbuild watch mode (auto-rebuild on changes)
- `npm start -- <file>` — run the reader with a file
- `node dist/cli.js --resume` — resume from last reading position
- `node dist/cli.js --encoding gbk <file>` — specify file encoding
- `node dist/cli.js --browse` — open file browser at startup
- No test or lint commands exist in the project

## Architecture

**Stack:** TypeScript + React 18 + Ink 5 (terminal UI framework) + esbuild bundler.

**Entry point:** `src/index.ts` — parses CLI args with `commander`, enters alternate screen buffer (`\x1b[?1049h`), mounts `<App>` via Ink's `render()`. Exits on app unmount.

**Component hierarchy:**
```
<App>
  <ThemeProvider>            ← React context for theme
    <AppContent>
      [mode='bookshelf'] <Bookshelf> → <FileBrowser>
      [mode='reading']  <Reader>     → <TextViewer> + <StatusBar>
                           overlays: <CommandBar> | <SearchBar> | <HelpPanel>
```

**State management:** React `useState`/`useCallback` only — no external state library. State flows downward through props. Mode routing in `app.tsx` toggles between bookshelf (home) and reading views.

**Reader state machine (`reader.tsx`):** Four `ReadingMode` values — `normal`, `command`, `search`, `help`. The `useInput` hook dispatches by mode in order: command input → search input → help (passthrough) → normal mode vim keys.

**Key patterns:**
- Text wrapping is CJK-aware (Chinese/Japanese/Korean chars = 2 columns wide) — `src/utils/wrap-text.ts`
- Scroll offset is in **visual line space**, not logical line space — `getVisualLineCount` precomputes how many visual rows each logical line occupies
- Encoding detection: UTF-8 BOM sniffing + heuristic, with `iconv-lite` fallback for GBK — `src/utils/encoding.ts`
- Persistence: `~/.novel-cli/{history,bookmarks,keymap}.json` — `src/utils/storage.ts`
- Themes defined as static objects in `src/themes/index.ts`, provided via React context in `src/hooks/use-theme.tsx`
- Vim keybindings in `reader.tsx`: `j`/`k` (scroll), `Ctrl+d`/`Ctrl+u` (half page), `g`/`G` (start/end), `n`/`N` (search next/prev), `:` (command), `/` (search), `m`/`` ` `` (bookmarks)
- Command parser supports: `:q`, `:open <path>`, `:help`, `:goto <line>`, `:search <text>`, `:set number`, `:encoding <utf-8|gbk>`, `:theme <name>`
- `useFile` hook handles file loading with memoization — `src/hooks/use-file.ts`

## Project structure

```
src/
  index.ts              — CLI entry (commander + Ink render)
  app.tsx               — Root component, mode router
  types.ts              — Shared type defs (AppMode, Theme, AppState, etc.)
  components/           — Ink components for each screen/overlay
  hooks/                — Custom React hooks (useFile, useTheme)
  themes/               — Theme definitions (dark, light, high-contrast)
  utils/                — Pure functions (commands, encoding, storage, wrap-text)
```
