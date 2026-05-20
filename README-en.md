# Novel CLI 📖

**中文** | [English](README-en.md)

A terminal-based fullscreen novel reader with Vim-style keybindings. Features automatic chapter detection, table of contents, bookmarks, encoding auto-detection, and more.

Built with TypeScript + [React 18](https://react.dev/) + [Ink 5](https://github.com/vadimdemedes/ink).

---

## Features

- **Vim-style navigation** — `j`/`k` scroll, `Ctrl+d`/`Ctrl+u` half page, `g`/`G` chapter start/end
- **Auto chapter detection** — Recognizes `第X章`, numbered titles, and other Chinese novel chapter patterns
- **Chapter-based reading** — Read one chapter at a time, `[`/`]` to switch chapters
- **Table of contents** — `t` or `:toc` opens a searchable TOC overlay
- **Search** — `/` to search, `n`/`N` for next/previous match
- **Bookmarks** — `m` to set, `` ` `` to jump
- **Command system** — `:` enters command mode (`:q`, `:open`, `:goto`, etc.)
- **Encoding detection** — Auto-detects UTF-8/GBK, with `--encoding` manual override
- **Reading progress** — Auto-saves chapter progress, `--resume` to continue where you left off
- **File browser** — Built-in file picker for `.txt`/`.md` files
- **Bookshelf** — Home screen with recent reading history

---

## Usage

```bash
novel [file] [options]

Arguments:
  file                    Path to a .txt file

Options:
  --resume                Resume from last reading position
  --encoding <encoding>   Specify file encoding (utf-8 or gbk)
  --browse                Open file browser on startup
  --help                  Show help
```

### Examples

```bash
# Open a file
novel ./novel.txt

# Resume reading
novel --resume

# Specify GBK encoding
novel --encoding gbk ./book.txt

# Open file browser
novel --browse

# Open bookshelf (no arguments)
novel
```

---

## Keybindings

| Key | Action |
|-----|--------|
| `j` / `↓` | Scroll down |
| `k` / `↑` | Scroll up |
| `Ctrl+d` / `PgDn` | Half page down |
| `Ctrl+u` / `PgUp` | Half page up |
| `g` / `G` | Chapter start / end |
| `[` / `]` | Previous / Next chapter |
| `t` | Open table of contents |
| `/` | Search (`n`/`N` next/prev) |
| `:` | Enter command mode |
| `Esc` | Cancel / Close panel / Go back |
| `m` / `` ` `` | Set bookmark / Jump to bookmark |

### Commands

| Command | Action |
|---------|--------|
| `:q` | Quit |
| `:help` | Show help panel |
| `:toc` | Open table of contents |
| `:goto <line>` | Go to line |
| `:open <path>` | Open a file |
| `:encoding <enc>` | Set encoding (utf-8 / gbk) |
| `:set number` | Toggle line numbers |
| `:123` | Go to line (shortcut) |

---

## Data Storage

Reading history, bookmarks, and keybindings are stored in `~/.novel-cli/`:

```
~/.novel-cli/
├── history.json     # Reading progress (percentage)
├── bookmarks.json   # Bookmarks
└── keymap.json      # Keybinding config
```

---

## Build from Source

```bash
git clone https://github.com/Orekiz/novel-cli.git
cd novel-cli
npm install
npm run build
```

The output is `dist/cli.js`. Run with `node dist/cli.js <file>` or use `npm link` to make the `novel` command available globally.

---

## Architecture

```
src/
├── index.ts               # CLI entry (Commander + Ink render)
├── app.tsx                # Root component, mode router
├── types.ts               # Type definitions
├── components/
│   ├── reader.tsx         # Reader (state machine core)
│   ├── bookshelf.tsx      # Bookshelf home screen
│   ├── toc-panel.tsx      # TOC overlay
│   ├── text-viewer.tsx    # Text rendering
│   ├── status-bar.tsx     # Status bar
│   ├── command-bar.tsx    # Command input
│   ├── search-bar.tsx     # Search input
│   ├── help-panel.tsx     # Help overlay
│   └── file-browser.tsx   # File browser
├── hooks/
│   ├── use-file.ts        # File loading hook
│   └── use-theme.tsx      # Theme context
├── themes/
│   └── index.ts           # Theme definitions
└── utils/
    ├── chapter-parser.ts  # Chapter detection
    ├── commands.ts        # Command parser
    ├── encoding.ts        # Encoding detection/decoding
    ├── storage.ts         # Persistence layer
    └── wrap-text.ts       # CJK-aware text wrapping
```

**Stack:** TypeScript · React 18 · Ink 5 · Commander · iconv-lite · esbuild

---

## License

[MIT](LICENSE)
