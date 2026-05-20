# Changelog

## [0.2.0] - 2026-05-20

### Added

- **Chapter auto-detection** — Automatically recognizes chapter boundaries using patterns like `第X章/节/回/卷` and numbered titles. Non-chapter content (prologue/epilogue) is treated as separate sections.
- **Chapter-based reading** — Display is constrained to one chapter at a time, accessible via `[`/`]` shortcuts.
- **Table of contents overlay** — Press `t` or use `:toc` command to open a searchable chapter list. Supports `j`/`k` navigation and `/` filtering.
- **Chapter indicator in status bar** — Shows current chapter title and total chapter count.
- **`:toc` command** — Opens the table of contents from command mode.
- **Help panel shortcuts** — Added entries for TOC (`t`) and chapter navigation (`[`/`]`).

### Changed

- **Reading progress tracking** — Replaced line-number-based position with chapter-based progress percentage (`lastProgress`).
- **Status bar** — Removed line number display (`L X/Y`). Progress now reflects chapter completion percentage.
- **Project naming** — Renamed from `novel` to `novel-cli`. Data directory moved from `~/.novel-reader/` to `~/.novel-cli/`.
- **File name display** — File extensions are now stripped when showing novel names in bookshelf and status bar.
- **Bookshelf title** — Updated to "Novel Reader Cli - Bookshelf".

### Fixed

- **`:toc` and `:help` commands not switching to overlay mode** — `handleCommand` unconditionally reset reading mode to `'normal'` after execution, overriding the intended `'toc'`/`'help'` mode.
- **TOC panel overlapping with text viewer** — TocPanel was rendered below the text viewer instead of replacing it, causing text corruption and display gaps.
- **Help panel overlapping and display corruption** — Same root cause as TOC; HelpPanel now replaces the text viewer area. Border and layout redesigned for compact fit.
- **Help panel hint text** — Updated to reflect Esc-only close behavior; removed `q` close shortcut.
- **Help panel text inaccuracies** — Fixed outdated command descriptions and missing entries (`:toc`).
- **Bookshelf resume button not updating** — Reader now saves position synchronously before navigation, preventing stale history reads on bookshelf mount.
- **File extension in novel name** — `.txt`/`.md` extensions are stripped when saving to history and displaying in the UI.

### Documentation

- Added Chinese and English README files.
- Added MIT License.

[0.2.0]: https://github.com/Orekiz/novel-cli/releases/tag/v0.2.0
